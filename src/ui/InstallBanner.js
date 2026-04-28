const STORAGE_KEY = 'install_prompted'

function isStandalone() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
}

export function InstallBanner(container) {
  if (isStandalone() || localStorage.getItem(STORAGE_KEY)) return

  const banner = document.createElement('div')
  banner.className = 'install-banner'
  banner.innerHTML = `
    <span>Install Foot.Note: tap <strong>Share</strong> → <strong>Add to Home Screen</strong> for offline access. Your notes and GPS data never leave this device.</span>
    <button class="install-banner-dismiss" aria-label="Dismiss">✕</button>
  `

  banner.querySelector('.install-banner-dismiss').addEventListener('click', () => {
    banner.remove()
    localStorage.setItem(STORAGE_KEY, 'true')
  })

  container.prepend(banner)
}
