let _el = null

function _ensureEl() {
  if (_el) return _el

  const sheet = document.createElement('div')
  sheet.className = 'icloud-setup-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Set up iCloud Drive backup')

  sheet.innerHTML = `
    <div class="icloud-setup-header">
      <button class="icloud-setup-close" aria-label="Close">×</button>
      <span class="icloud-setup-title">Back up to iCloud Drive</span>
      <div aria-hidden="true"></div>
    </div>
    <div class="icloud-setup-body">

      <p class="icloud-setup-intro">One change in Settings, and every walk backs up to iCloud Drive on its own, and shows up in Finder on your Mac.</p>

      <ol class="icloud-setup-steps">

        <li class="icloud-setup-step">
          <div class="icloud-step-label">Open <strong>Settings</strong> and scroll to <strong>Safari</strong></div>
          <div class="icloud-sim" aria-hidden="true">
            <div class="icloud-sim-titlebar">Settings</div>
            <div class="icloud-sim-group">
              <div class="icloud-sim-row">
                <span class="icloud-sim-app-icon" style="background:#FF9500">🔔</span>
                <span class="icloud-sim-row-label">Sounds &amp; Haptics</span>
                <span class="icloud-sim-chevron">›</span>
              </div>
              <div class="icloud-sim-row icloud-sim-row--hl">
                <span class="icloud-sim-app-icon" style="background:#006CFF">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="9" stroke="white" stroke-width="1.5"/><line x1="10" y1="1" x2="10" y2="19" stroke="white" stroke-width="1.5"/><line x1="1" y1="10" x2="19" y2="10" stroke="white" stroke-width="1.5"/><ellipse cx="10" cy="10" rx="4" ry="9" stroke="white" stroke-width="1.5"/></svg>
                </span>
                <span class="icloud-sim-row-label icloud-sim-row-label--bold">Safari</span>
                <span class="icloud-sim-chevron">›</span>
              </div>
              <div class="icloud-sim-row">
                <span class="icloud-sim-app-icon" style="background:#34C759">💬</span>
                <span class="icloud-sim-row-label">Messages</span>
                <span class="icloud-sim-chevron">›</span>
              </div>
            </div>
          </div>
        </li>

        <li class="icloud-setup-step">
          <div class="icloud-step-label">Tap <strong>Downloads</strong></div>
          <div class="icloud-sim" aria-hidden="true">
            <div class="icloud-sim-titlebar">Safari</div>
            <div class="icloud-sim-group">
              <div class="icloud-sim-row">
                <span class="icloud-sim-row-label">Search Engine</span>
                <span class="icloud-sim-value">Google</span>
                <span class="icloud-sim-chevron">›</span>
              </div>
              <div class="icloud-sim-row icloud-sim-row--hl">
                <span class="icloud-sim-row-label icloud-sim-row-label--bold">Downloads</span>
                <span class="icloud-sim-chevron">›</span>
              </div>
              <div class="icloud-sim-row">
                <span class="icloud-sim-row-label">Privacy &amp; Security</span>
                <span class="icloud-sim-chevron">›</span>
              </div>
            </div>
          </div>
        </li>

        <li class="icloud-setup-step">
          <div class="icloud-step-label">Select <strong>iCloud Drive</strong></div>
          <div class="icloud-sim" aria-hidden="true">
            <div class="icloud-sim-titlebar">Downloads</div>
            <div class="icloud-sim-section-header">STORE DOWNLOADED FILES ON:</div>
            <div class="icloud-sim-group">
              <div class="icloud-sim-row">
                <span class="icloud-sim-row-label">On My iPhone</span>
              </div>
              <div class="icloud-sim-row icloud-sim-row--hl">
                <span class="icloud-sim-row-label icloud-sim-row-label--bold">iCloud Drive</span>
                <span class="icloud-sim-check">✓</span>
              </div>
              <div class="icloud-sim-row">
                <span class="icloud-sim-row-label">Other…</span>
              </div>
            </div>
            <div class="icloud-sim-footer">Or tap Other… to save into a specific Footnote folder inside iCloud Drive.</div>
          </div>
        </li>

      </ol>

      <a href="App-prefs:root=SAFARI" class="icloud-setup-cta">Open Safari Settings</a>
      <p class="icloud-setup-note">After this one-time change, each walk downloads automatically when you finish. It shows up in Files on your phone and Finder on your Mac, under iCloud Drive → Downloads.</p>

    </div>
  `

  document.body.appendChild(sheet)

  const closeBtn = sheet.querySelector('.icloud-setup-close')
  closeBtn.addEventListener('click', close)

  let _startY = 0
  sheet.addEventListener('touchstart', e => { _startY = e.touches[0].clientY }, { passive: true })
  sheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - _startY > 80) close()
  })

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet.classList.contains('open')) close()
  })

  _el = sheet
  return _el
}

function close() {
  if (_el) _el.classList.remove('open')
}

export function openICloudSetup() {
  _ensureEl().classList.add('open')
}
