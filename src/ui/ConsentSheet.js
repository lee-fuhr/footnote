import { storeMeta } from '../db/index.js'

let _el = null
let _resolve = null

function _ensureEl() {
  if (_el) return _el

  const scrim = document.createElement('div')
  scrim.className = 'consent-sheet-scrim'

  const sheet = document.createElement('div')
  sheet.className = 'consent-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'AI analysis consent')
  sheet.innerHTML = `
    <div class="consent-sheet-body">
      <p class="consent-sheet-heading">Before Footnote looks for patterns in your walks</p>
      <p class="consent-sheet-text">Your walk text goes to Claude (Anthropic&rsquo;s AI), which reads it for recurring themes and then discards it. Nothing is stored on a server, and nothing is used to train the model.</p>
      <p class="consent-sheet-text">You can turn this off in Settings whenever you like.</p>
    </div>
    <div class="consent-sheet-actions">
      <button class="consent-btn-no">No thanks</button>
      <button class="consent-btn-yes">Got it</button>
    </div>
  `

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  const yesBtn = sheet.querySelector('.consent-btn-yes')
  const noBtn  = sheet.querySelector('.consent-btn-no')

  async function accept() {
    await storeMeta('insightsConsentGiven', true)
    _dismiss()
    if (_resolve) { _resolve(true); _resolve = null }
  }

  async function decline() {
    await storeMeta('insightsConsentGiven', false)
    _dismiss()
    if (_resolve) { _resolve(false); _resolve = null }
  }

  function _dismiss() {
    sheet.classList.remove('open')
    scrim.classList.remove('open')
  }

  yesBtn.addEventListener('click', accept)
  noBtn.addEventListener('click', decline)
  scrim.addEventListener('click', decline)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet.classList.contains('open')) decline()
  })

  _el = { sheet, scrim }
  return _el
}

/** Shows consent sheet. Resolves true if accepted, false if declined. */
export function requestConsent() {
  const el = _ensureEl()
  el.sheet.classList.add('open')
  el.scrim.classList.add('open')
  return new Promise(resolve => { _resolve = resolve })
}
