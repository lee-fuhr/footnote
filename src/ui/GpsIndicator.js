import { getIndicatorClass, getPermissionStatus } from '../gps/index.js'
import { alertSheet } from './ConfirmSheet.js'

const STATUS_TEXT = {
  'gps-acquiring':  'searching',
  'gps-live':       'live',
  'gps-live-low':   'weak signal',
  'gps-stale':      'no signal',
  'gps-unavailable': 'off',
}

const STATUS_ARIA = {
  'gps-acquiring':  'GPS acquiring position',
  'gps-live':       'GPS active',
  'gps-live-low':   'GPS active, weak signal',
  'gps-stale':      'GPS has no signal. Using last known position.',
  'gps-unavailable': 'GPS unavailable',
}

export function GpsIndicator(container) {
  const btn = document.createElement('button')
  btn.className = 'gps-btn gps-unavailable'
  btn.setAttribute('aria-label', 'GPS status: unavailable')
  btn.title = 'GPS unavailable'
  btn.innerHTML = `<span class="gps-dot"></span><span class="gps-label-text"></span>`
  container.appendChild(btn)

  const labelText = btn.querySelector('.gps-label-text')

  btn.addEventListener('click', () => {
    if (getPermissionStatus() === 'denied') {
      alertSheet('To re-enable GPS, go to Settings → Privacy & Security → Location Services → Safari → Allow While Using App.')
    }
  })

  return {
    update() {
      const cls = getIndicatorClass()
      btn.className = `gps-btn ${cls}`
      labelText.textContent = STATUS_TEXT[cls] ?? ''
      const aria = STATUS_ARIA[cls] ?? 'GPS unavailable'
      btn.setAttribute('aria-label', `GPS status: ${aria.toLowerCase()}`)
      btn.title = aria
    }
  }
}
