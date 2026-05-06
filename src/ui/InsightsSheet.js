import { getMeta, storeMeta } from '../db/index.js'

let _el = null
let _touchStartX = 0
let _touchStartY = 0
const SWIPE_OPEN_THRESHOLD = 80

function _ensureEl() {
  if (_el) return _el

  const hint = document.createElement('div')
  hint.className = 'insights-hint'
  hint.setAttribute('aria-hidden', 'true')
  document.body.appendChild(hint)

  const sheet = document.createElement('div')
  sheet.className = 'insights-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Walk insights')
  sheet.innerHTML = `
    <div class="insights-header">
      <button class="insights-back-btn" aria-label="Back to walk">‹ walk</button>
      <span class="insights-title">Insights</span>
      <div class="insights-header-actions"></div>
    </div>
    <div class="insights-body">
      <div class="insights-empty">
        <p class="insights-empty-heading">Your walking thoughts,<br>organized.</p>
        <p class="insights-empty-sub">Keep walking — themes and patterns will appear here after a few walks.</p>
      </div>
    </div>
  `
  document.body.appendChild(sheet)

  const backBtn = sheet.querySelector('.insights-back-btn')
  backBtn.addEventListener('click', close)

  // Swipe right to close
  let _closeStartX = 0
  sheet.addEventListener('touchstart', e => {
    _closeStartX = e.touches[0].clientX
  }, { passive: true })
  sheet.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _closeStartX
    if (dx > SWIPE_OPEN_THRESHOLD) close()
  })

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet.classList.contains('open')) close()
  })

  _el = { sheet, hint }
  return _el
}

async function _refreshHint(count) {
  const { hint } = _ensureEl()
  if (count >= 10) {
    hint.hidden = true
    return
  }
  hint.hidden = false
  if (count < 3) {
    hint.innerHTML = 'Insights <span class="insights-hint-arrow">→</span>'
    hint.classList.add('has-label')
  } else {
    hint.innerHTML = '<span class="insights-hint-arrow">→</span>'
    hint.classList.remove('has-label')
  }
}

export function close() {
  if (!_el) return
  _el.sheet.classList.remove('open')
}

export async function initInsights(canvasBody) {
  const count = (await getMeta('insightSwipeCount')) ?? 0
  _ensureEl()
  await _refreshHint(count)

  canvasBody.addEventListener('touchstart', e => {
    _touchStartX = e.touches[0].clientX
    _touchStartY = e.touches[0].clientY
  }, { passive: true })

  canvasBody.addEventListener('touchend', async e => {
    const dx = e.changedTouches[0].clientX - _touchStartX
    const dy = Math.abs(e.changedTouches[0].clientY - _touchStartY)
    if (dx < -SWIPE_OPEN_THRESHOLD && dy < Math.abs(dx)) {
      const newCount = ((await getMeta('insightSwipeCount')) ?? 0) + 1
      await storeMeta('insightSwipeCount', newCount)
      await _refreshHint(newCount)
      _ensureEl().sheet.classList.add('open')
    }
  })
}
