let _el = null

function ensureEl() {
  if (_el) return _el

  const scrim = document.createElement('div')
  scrim.className = 'confirm-sheet-scrim'

  const sheet = document.createElement('div')
  sheet.className = 'confirm-sheet'
  sheet.innerHTML = `
    <p class="confirm-sheet-msg"></p>
    <div class="confirm-sheet-actions">
      <button class="confirm-sheet-cancel"></button>
      <button class="confirm-sheet-ok"></button>
    </div>
  `
  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  _el = {
    sheet,
    scrim,
    msg: sheet.querySelector('.confirm-sheet-msg'),
    ok: sheet.querySelector('.confirm-sheet-ok'),
    cancel: sheet.querySelector('.confirm-sheet-cancel'),
    _resolve: null,
  }

  const dismiss = val => {
    sheet.classList.remove('open')
    scrim.classList.remove('open')
    if (_el._resolve) { _el._resolve(val); _el._resolve = null }
  }

  _el.ok.addEventListener('click', () => dismiss(true))
  _el.cancel.addEventListener('click', () => dismiss(false))
  scrim.addEventListener('click', () => dismiss(false))
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet.classList.contains('open')) dismiss(false)
  })

  return _el
}

export function confirmSheet(message, { okLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  const el = ensureEl()
  el.msg.textContent = message
  el.ok.textContent = okLabel
  el.cancel.textContent = cancelLabel
  el.cancel.hidden = !cancelLabel
  el.ok.className = danger ? 'confirm-sheet-ok confirm-sheet-ok--danger' : 'confirm-sheet-ok'
  el.sheet.classList.add('open')
  el.scrim.classList.add('open')
  ;(cancelLabel ? el.cancel : el.ok).focus()
  return new Promise(res => { el._resolve = res })
}

export function alertSheet(message) {
  return confirmSheet(message, { okLabel: 'Got it', cancelLabel: null })
}
