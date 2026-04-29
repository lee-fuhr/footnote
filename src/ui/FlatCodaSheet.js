import { markCoded } from '../session/coded.js'
import { markSessionStarred } from '../session/starred.js'
import { chunkBodyText } from '../db/index.js'

function FlatCodaSheetEl() {
  const el = document.createElement('div')
  el.className = 'flat-coda-sheet'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', 'Review your walk')
  el.setAttribute('tabindex', '-1')

  el.innerHTML = `
    <div class="flat-coda-header">
      <p class="flat-coda-title">Your walk</p>
    </div>
    <div class="flat-coda-body"></div>
    <div class="flat-coda-actions">
      <button class="flat-coda-btn-done">Done</button>
      <button class="flat-coda-btn-star">&#9733; Keep</button>
    </div>
  `

  document.body.appendChild(el)

  const bodyEl   = el.querySelector('.flat-coda-body')
  const doneBtn  = el.querySelector('.flat-coda-btn-done')
  const starBtn  = el.querySelector('.flat-coda-btn-star')

  let _sessionId = null

  function open(session) {
    _sessionId = session.id
    bodyEl.textContent = chunkBodyText(session.body)
    el.classList.add('open')
    el.focus()
  }

  function _close(starred) {
    markCoded(_sessionId)
    if (starred) markSessionStarred(_sessionId)
    el.classList.remove('open')
    document.dispatchEvent(new CustomEvent('footnote:coda-complete', {
      detail: { sessionId: _sessionId, starred },
    }))
  }

  doneBtn.addEventListener('click', () => _close(false))
  starBtn.addEventListener('click', () => _close(true))

  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') _close(false)
  })

  return { open }
}

let _instance = null
export function flatCodaSheet(session) {
  if (!_instance) _instance = FlatCodaSheetEl()
  _instance.open(session)
}
