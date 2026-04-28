import { getSessionLines, starLine } from '../db/index.js'
import { dxToAction } from '../gestures.js'
import { markCoded } from '../session/coded.js'
import { caughtCount } from '../format/caughtCount.js'

// Stub: always false until AI Pack tier check is implemented
function canAutoCoda() {
  // TODO: check user's tier from identity
  return false
}

function CodaSheetEl() {
  const el = document.createElement('div')
  el.className = 'coda-sheet'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', 'Review your walk')
  el.setAttribute('tabindex', '-1')

  el.innerHTML = `
    <div class="coda-header">
      <p class="coda-title">Review your walk</p>
      <button class="coda-close" aria-label="Close">&#215;</button>
    </div>
    <div class="coda-progress" aria-live="polite"></div>
    <div class="coda-card-area"></div>
    <div class="coda-summary" hidden>
      <p class="coda-summary-text"></p>
      <button class="coda-done">Done</button>
    </div>
  `

  document.body.appendChild(el)

  const progressEl  = el.querySelector('.coda-progress')
  const cardArea    = el.querySelector('.coda-card-area')
  const summaryEl   = el.querySelector('.coda-summary')
  const summaryText = el.querySelector('.coda-summary-text')
  const doneBtn     = el.querySelector('.coda-done')
  const closeBtn    = el.querySelector('.coda-close')

  let _lines = []
  let _index = 0
  let _starredCount = 0
  let _sessionId = null
  let _touchStartX = 0

  async function open(sessionId) {
    const lines = await getSessionLines(sessionId)
    if (!lines.length) {
      document.dispatchEvent(new CustomEvent('footnote:toast', { detail: { msg: 'Nothing to review from that walk.' } }))
      return
    }

    _lines = lines
    _index = 0
    _starredCount = 0
    _sessionId = sessionId
    summaryEl.hidden = true
    cardArea.hidden = false
    progressEl.hidden = false

    el.classList.add('open')
    el.focus()
    _render()
  }

  function close() {
    el.classList.remove('open')
  }

  function _render() {
    if (_index >= _lines.length) {
      _showSummary()
      return
    }

    const line = _lines[_index]
    // Indeterminate progress bar instead of "X of Y" — the philosophy doesn't tally
    const pct = Math.round(((_index + 1) / _lines.length) * 100)
    progressEl.style.setProperty('--coda-progress', `${pct}%`)
    progressEl.setAttribute('aria-valuenow', String(_index + 1))
    progressEl.setAttribute('aria-valuemax', String(_lines.length))

    cardArea.innerHTML = `
      <div class="coda-card">
        <p class="coda-card-text">${_esc(line.text)}</p>
        <div class="coda-card-actions">
          <button class="coda-btn-pass" aria-label="Skip this line">Skip</button>
          <button class="coda-btn-star" aria-label="Star this line">&#9733; Keep</button>
        </div>
      </div>
    `

    const card    = cardArea.querySelector('.coda-card')
    const passBtn = cardArea.querySelector('.coda-btn-pass')
    const starBtn = cardArea.querySelector('.coda-btn-star')

    passBtn.addEventListener('click', () => _act('pass'))
    starBtn.addEventListener('click', () => _act('star'))

    card.addEventListener('touchstart', e => {
      _touchStartX = e.touches[0].clientX
      card.style.opacity = '0.8'
      card.style.transform = 'scale(0.98)'
    }, { passive: true })

    card.addEventListener('touchend', e => {
      card.style.opacity = ''
      card.style.transform = ''
      const dx = e.changedTouches[0].clientX - _touchStartX
      const action = dxToAction(dx)
      if (action !== 'noop') _act(action)
    })

    card.addEventListener('touchcancel', () => {
      card.style.opacity = ''
      card.style.transform = ''
    })
  }

  async function _act(action) {
    const line = _lines[_index]
    if (action === 'star') {
      await starLine(line.id)
      _starredCount++
    }
    _index++
    _render()
  }

  function _showSummary() {
    cardArea.hidden = true
    progressEl.hidden = true
    summaryEl.hidden = false
    summaryText.textContent = caughtCount(_starredCount)
    markCoded(_sessionId)
    document.dispatchEvent(new CustomEvent('footnote:coda-complete', { detail: { sessionId: _sessionId, starred: _starredCount } }))

    // Closing line — frames the silence so the moment doesn't read as void.
    // Fades after 4 seconds. Italic serif, low contrast.
    if (!summaryEl.querySelector('.coda-closing')) {
      const closing = document.createElement('p')
      closing.className = 'coda-closing'
      closing.textContent = 'That’s all.'
      summaryEl.appendChild(closing)
      setTimeout(() => closing.classList.add('coda-closing--fade'), 200)
    }
  }

  function _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  doneBtn.addEventListener('click', close)
  closeBtn.addEventListener('click', close)

  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowRight') _act('star')
    if (e.key === 'ArrowLeft')  _act('pass')
  })

  return { open, close }
}

let _instance = null
export function codaSheet(sessionId) {
  if (!_instance) _instance = CodaSheetEl()
  _instance.open(sessionId)
}
