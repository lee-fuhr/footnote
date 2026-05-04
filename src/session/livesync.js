import { autoExport, hasFolder } from '../export/icloud.js'
import { logger } from '../logger.js'

let _timer = null
let _getSession = null
let _inFlight = false

const DEFAULT_INTERVAL_MS = 10_000

export async function fireSync(getSessionFn) {
  const getter = getSessionFn ?? _getSession
  if (!getter) return { saved: false, reason: 'no-session' }
  if (!(await hasFolder())) return { saved: false, reason: 'no-folder' }
  if (_inFlight) return { saved: false, reason: 'in-flight' }
  _inFlight = true
  try {
    const session = await getter()
    if (!session) return { saved: false, reason: 'no-session' }
    const result = await autoExport(session)
    if (!result.saved) {
      logger.warn('livesync', 'export_failed', { reason: result.reason })
    }
    return result
  } finally {
    _inFlight = false
  }
}

export function startLiveSync(getSessionFn, intervalMs = DEFAULT_INTERVAL_MS) {
  stopLiveSync()
  _getSession = getSessionFn
  fireSync()
  _timer = setInterval(fireSync, intervalMs)
}

export function stopLiveSync() {
  if (_timer !== null) {
    clearInterval(_timer)
    _timer = null
  }
  _getSession = null
}

export const _resetForTesting = import.meta.env.DEV
  ? () => {
      if (_timer !== null) { clearInterval(_timer); _timer = null }
      _getSession = null
      _inFlight = false
    }
  : /* c8 ignore next */ () => {}
