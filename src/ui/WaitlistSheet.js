const WAITLIST_KEY = 'footnote_waitlist'

function WaitlistSheetEl() {
  const scrim = document.createElement('div')
  scrim.className = 'waitlist-sheet-scrim'

  const sheet = document.createElement('div')
  sheet.className = 'waitlist-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Join the AI pack waitlist')

  sheet.innerHTML = `
    <p class="waitlist-sheet-title">AI pack waitlist</p>
    <p class="waitlist-sheet-body">We&rsquo;ll notify you when it&rsquo;s ready. No spam. One email, ever.</p>
    <input class="waitlist-sheet-email" type="email" placeholder="your@email.com"
      autocomplete="email" autocapitalize="off" autocorrect="off" inputmode="email"/>
    <div class="waitlist-sheet-actions">
      <button class="waitlist-sheet-submit">Join</button>
      <button class="waitlist-sheet-cancel">Cancel</button>
    </div>
    <p class="waitlist-sheet-confirm" hidden>You're on the list. We'll be in touch.</p>
  `

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  const emailEl   = sheet.querySelector('.waitlist-sheet-email')
  const submitBtn = sheet.querySelector('.waitlist-sheet-submit')
  const cancelBtn = sheet.querySelector('.waitlist-sheet-cancel')
  const confirmEl = sheet.querySelector('.waitlist-sheet-confirm')
  const actionsEl = sheet.querySelector('.waitlist-sheet-actions')

  function open() {
    const existing = _getStored()
    sheet.classList.add('open')
    scrim.classList.add('open')
    if (existing) {
      _showConfirm()
    } else {
      emailEl.value = ''
      emailEl.focus()
    }
  }

  function close() {
    sheet.classList.remove('open')
    scrim.classList.remove('open')
  }

  function _showConfirm() {
    actionsEl.hidden = true
    emailEl.hidden   = true
    confirmEl.hidden = false
  }

  function _getStored() {
    try { return JSON.parse(localStorage.getItem(WAITLIST_KEY)) } catch { return null }
  }

  submitBtn.addEventListener('click', async () => {
    const email = emailEl.value.trim()
    if (!email || !email.includes('@')) {
      emailEl.focus()
      emailEl.style.borderColor = 'var(--tan)'
      return
    }
    emailEl.style.borderColor = ''

    const entry = { email, ts: Date.now(), ua: navigator.userAgent }
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(entry))

    // Fire-and-forget to Formspree (swap in real endpoint when ready)
    const endpoint = 'https://formspree.io/f/placeholder'
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, source: 'ai-pack-waitlist' }),
    }).catch(() => {})

    _showConfirm()
    setTimeout(close, 2200)
  })

  cancelBtn.addEventListener('click', close)
  scrim.addEventListener('click', close)

  emailEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitBtn.click()
    if (e.key === 'Escape') close()
  })

  return { open, close }
}

let _instance = null
export function waitlistSheet() {
  if (!_instance) _instance = WaitlistSheetEl()
  _instance.open()
}
