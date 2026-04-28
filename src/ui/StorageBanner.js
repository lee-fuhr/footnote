import { estimateStorage } from '../storage/quota.js'
import { logger } from '../logger.js'

let _banner = null

export async function StorageBanner(container) {
  const { percent, level } = await estimateStorage()
  logger.info('storage', 'quota_check', { percent, level })

  if (_banner) _banner.remove()
  if (level === 'ok' || level === 'log') return

  _banner = document.createElement('div')
  _banner.className = `storage-banner storage-${level}`

  if (level === 'warn') {
    _banner.innerHTML = `Storage at ${percent}%. Consider exporting old walks. <button class="storage-dismiss">✕</button>`
    _banner.querySelector('.storage-dismiss').addEventListener('click', () => _banner.remove())
  } else if (level === 'urgent') {
    _banner.textContent = `Storage nearly full (${percent}%). Scroll down to export and delete old walks.`
  } else if (level === 'block') {
    _banner.textContent = `Storage full. Scroll down to export walks, then delete them to continue.`
  }

  container.prepend(_banner)
  return _banner
}
