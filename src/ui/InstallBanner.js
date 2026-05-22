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
    <span>Install Footnote: tap <strong>Share</strong> → <strong>Add to Home Screen</strong> so it opens like an app and works offline. No account, no login. Your walks and their location stay on your device. The only thing that ever leaves is your walk text, sent to Claude when you turn on AI analysis, and discarded right after.</span>
    <button class="install-banner-dismiss" aria-label="Dismiss">✕</button>
  `

  banner.querySelector('.install-banner-dismiss').addEventListener('click', () => {
    banner.remove()
    localStorage.setItem(STORAGE_KEY, 'true')
  })

  container.prepend(banner)
}
