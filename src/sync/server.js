/**
 * Server sync — backs walks up to the Vercel API on three triggers:
 *   1. Every 60s during an active walk (in-progress protection)
 *   2. On session end (authoritative final copy)
 *   3. On visibilitychange → hidden (iOS background protection)
 *
 * Fire-and-forget everywhere. Sync failures are logged but never surface
 * to the user or block any UI action.
 */
import { sessionToMarkdown } from '../export/markdown.js'
import { logger } from '../logger.js'

const SYNC_URL = '/api/walks/sync'
const INTERVAL_MS = 10_000

let _timer = null
let _getSession = null
let _inFlight = false

export async function syncWalkToServer(session) {
  if (!session?.id) return { ok: false, reason: 'no-session' }
  const content = sessionToMarkdown(session, [])
  try {
    const r = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: session.id,
        content,
        startedAt: session.startedAt,
        endedAt: session.endedAt ?? null,
      }),
    })
    if (!r.ok) {
      logger.warn('server-sync', 'post_failed', { status: r.status })
      return { ok: false, reason: `http_${r.status}` }
    }
    return { ok: true }
  } catch (err) {
    logger.warn('server-sync', 'post_error', { error: err?.message })
    return { ok: false, reason: 'network_error' }
  }
}

async function _tick() {
  if (!_getSession || _inFlight) return
  _inFlight = true
  try {
    const session = await _getSession()
    if (session) await syncWalkToServer(session)
  } finally {
    _inFlight = false
  }
}

export function startServerSync(getSessionFn, intervalMs = INTERVAL_MS) {
  stopServerSync()
  _getSession = getSessionFn
  _tick()
  _timer = setInterval(_tick, intervalMs)
}

export function stopServerSync() {
  if (_timer !== null) { clearInterval(_timer); _timer = null }
  _getSession = null
  _inFlight = false
}

// iOS background protection — sync immediately when app is hidden
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _tick()
  })
}

// Test reset — stripped from production builds
export const _resetForTesting = import.meta.env.DEV
  ? () => { stopServerSync(); _inFlight = false }
  : /* c8 ignore next */ () => {}
