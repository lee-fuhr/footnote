import { setAuth } from '../identity.js'

const PHONE_RE = /^\+?[\d\s\-\(\)]{7,15}$/

function AuthSheetEl() {
  const scrim = document.createElement('div')
  scrim.className = 'auth-sheet-scrim'

  const sheet = document.createElement('div')
  sheet.className = 'auth-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Verify your phone')

  sheet.innerHTML = `
    <p class="auth-sheet-title">Verify your phone</p>
    <p class="auth-sheet-body">One SMS, then you’re set. We’ll never share your number.</p>

    <div class="auth-step auth-step--phone">
      <input class="auth-sheet-input" type="tel" placeholder="+1 555 000 0000"
        autocomplete="tel" autocapitalize="off" autocorrect="off" inputmode="tel"/>
      <p class="auth-sheet-error" hidden></p>
      <div class="auth-sheet-actions">
        <button class="auth-sheet-submit">Send code</button>
        <button class="auth-sheet-cancel">Cancel</button>
      </div>
    </div>

    <div class="auth-step auth-step--code" hidden>
      <input class="auth-sheet-input auth-sheet-code" type="text" inputmode="numeric"
        maxlength="6" placeholder="6-digit code"
        autocomplete="one-time-code" autocorrect="off" autocapitalize="off"/>
      <p class="auth-sheet-error" hidden></p>
      <div class="auth-sheet-actions">
        <button class="auth-sheet-verify">Verify</button>
        <button class="auth-sheet-back">Back</button>
      </div>
    </div>

    <p class="auth-sheet-confirm" hidden>You’re verified. Votes now count across devices.</p>
  `

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  const phoneStep   = sheet.querySelector('.auth-step--phone')
  const codeStep    = sheet.querySelector('.auth-step--code')
  const phoneInput  = phoneStep.querySelector('.auth-sheet-input')
  const codeInput   = codeStep.querySelector('.auth-sheet-code')
  const phoneError  = phoneStep.querySelector('.auth-sheet-error')
  const codeError   = codeStep.querySelector('.auth-sheet-error')
  const submitBtn   = phoneStep.querySelector('.auth-sheet-submit')
  const verifyBtn   = codeStep.querySelector('.auth-sheet-verify')
  const cancelBtn   = phoneStep.querySelector('.auth-sheet-cancel')
  const backBtn     = codeStep.querySelector('.auth-sheet-back')
  const confirmEl   = sheet.querySelector('.auth-sheet-confirm')

  let _phone = ''

  function open() {
    sheet.classList.add('open')
    scrim.classList.add('open')
    _resetToPhone()
    phoneInput.focus()
  }

  function close() {
    sheet.classList.remove('open')
    scrim.classList.remove('open')
  }

  function _showError(el, msg) {
    el.textContent = msg
    el.hidden = false
  }

  function _clearError(el) {
    el.hidden = true
    el.textContent = ''
  }

  function _resetToPhone() {
    phoneInput.value = ''
    codeInput.value = ''
    _clearError(phoneError)
    _clearError(codeError)
    phoneStep.hidden = false
    codeStep.hidden = true
    confirmEl.hidden = true
  }

  submitBtn.addEventListener('click', async () => {
    _clearError(phoneError)
    const phone = phoneInput.value.trim()
    if (!phone || !PHONE_RE.test(phone)) {
      _showError(phoneError, 'Enter a valid phone number (include country code, e.g. +1).')
      phoneInput.focus()
      return
    }

    submitBtn.disabled = true
    submitBtn.textContent = 'Sending…'
    try {
      const r = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await r.json()
      if (!r.ok) {
        _showError(phoneError, data.error || 'Something went wrong. Try again.')
        return
      }
      _phone = phone
      phoneStep.hidden = true
      codeStep.hidden = false
      codeInput.focus()
    } catch {
      _showError(phoneError, 'SMS delivery failed. Try again.')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = 'Send code'
    }
  })

  verifyBtn.addEventListener('click', async () => {
    _clearError(codeError)
    const code = codeInput.value.trim()
    if (!code || code.length < 4) {
      _showError(codeError, 'Enter the 6-digit code from your SMS.')
      codeInput.focus()
      return
    }

    verifyBtn.disabled = true
    verifyBtn.textContent = 'Verifying…'
    try {
      const r = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: _phone, code }),
      })
      const data = await r.json()
      if (!r.ok) {
        _showError(codeError, data.error || 'Verification failed. Try again.')
        return
      }
      setAuth(data.userId, data.token)
      phoneStep.hidden = true
      codeStep.hidden = true
      confirmEl.hidden = false
      setTimeout(close, 2000)
    } catch {
      _showError(codeError, 'Verification failed. Try again.')
    } finally {
      verifyBtn.disabled = false
      verifyBtn.textContent = 'Verify'
    }
  })

  backBtn.addEventListener('click', () => {
    codeStep.hidden = true
    phoneStep.hidden = false
    phoneInput.focus()
  })

  cancelBtn.addEventListener('click', close)
  scrim.addEventListener('click', close)

  phoneInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitBtn.click()
    if (e.key === 'Escape') close()
  })

  codeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyBtn.click()
    if (e.key === 'Escape') close()
  })

  return { open, close }
}

let _instance = null
export function authSheet() {
  if (!_instance) _instance = AuthSheetEl()
  _instance.open()
}
