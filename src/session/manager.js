import { transition, IDLE, ACTIVE, CLOSING } from './state.js'
import { shouldStartNewSession } from './gap.js'
import { openSession, closeSession, appendLine, getLastActiveSessionId, appendToBody, getAllSessions } from '../db/index.js'
import { logger } from '../logger.js'

let _state = IDLE
let _currentSessionId = null
let _lastLineTs = null
let _inactivityTimer = null
const INACTIVITY_CHECK_MS = 60 * 1000
const INACTIVITY_PROMPT_MS = 20 * 60 * 1000

function applyEffects(effects, session) {
  for (const effect of effects) {
    switch (effect) {
      case 'writeSessionToIDB': break  // handled by caller
      case 'startHeartbeat': writeHeartbeat(); break
      case 'startInactivityTimer': startInactivityTimer(); break
      case 'writeLineToIDB': break     // handled by caller
      case 'updateHeartbeat': writeHeartbeat(); break
      case 'resetInactivityTimer': resetInactivityTimer(); break
      case 'writeEndedAt': break       // handled by caller
      case 'clearLastActiveSessionId': break // handled by caller
      case 'clearHeartbeat': clearHeartbeat(); break
      case 'clearInactivityTimer': clearInactivityTimer(); break
    }
  }
}

function writeHeartbeat() {
  try {
    localStorage.setItem('session_heartbeat', JSON.stringify({
      sessionId: _currentSessionId,
      ts: Date.now(),
    }))
  } catch { /* storage full — gap detection will create a new session on next open */ }
}

function clearHeartbeat() {
  localStorage.removeItem('session_heartbeat')
}

function startInactivityTimer() {
  clearInactivityTimer()
  _inactivityTimer = setInterval(checkInactivity, INACTIVITY_CHECK_MS)
}

function resetInactivityTimer() {
  _lastLineTs = Date.now()
}

function clearInactivityTimer() {
  if (_inactivityTimer) { clearInterval(_inactivityTimer); _inactivityTimer = null }
}

function checkInactivity() {
  if (_state !== ACTIVE || !_lastLineTs) return
  if (Date.now() - _lastLineTs > INACTIVITY_PROMPT_MS) {
    document.dispatchEvent(new CustomEvent('footnote:inactivity-prompt'))
  }
}

/** Call on app open — checks heartbeat and opens/resumes session as needed. */
export async function initSession(onNewSession) {
  const raw = localStorage.getItem('session_heartbeat')
  if (raw) {
    try {
      const { sessionId, ts } = JSON.parse(raw)
      if (shouldStartNewSession(ts)) {
        // Gap exceeded — close old and open new
        logger.info('session', 'gap_detected', { oldSession: sessionId })
        await closeSession(sessionId)
        clearHeartbeat()
        const session = await _doOpen()
        onNewSession?.(session, 'gap')
        return session
      } else {
        // Resume active session — stamp heartbeat immediately
        _currentSessionId = sessionId
        _state = ACTIVE
        writeHeartbeat()
        startInactivityTimer()
        logger.info('session', 'resumed', { sessionId })
        // Return full session record so Editor can read session.body for routing
        const sessions = await getAllSessions()
        const session = sessions.find(s => s.id === sessionId)
        return session ?? { id: sessionId }
      }
    } catch {
      // Corrupted heartbeat — clear and start fresh
      clearHeartbeat()
    }
  }

  // No heartbeat — check IDB for dangling active session
  const activeId = await getLastActiveSessionId()
  if (activeId) {
    _currentSessionId = activeId
    _state = ACTIVE
    writeHeartbeat()
    startInactivityTimer()
    // Return full session record so Editor can read session.body for routing
    const sessions = await getAllSessions()
    const session = sessions.find(s => s.id === activeId)
    return session ?? { id: activeId }
  }

  return null  // no session — user must explicitly start one
}

async function _doOpen() {
  const result = transition(IDLE, 'openSession')
  const session = await openSession()
  // Init flat-doc body immediately — distinguishes walk sessions (body:'') from
  // legacy sessions (body: null). openSession() keeps body:null as its default
  // so the schema test stays green; we set '' here at the walk-start layer.
  await appendToBody(session.id, '')
  session.body = ''
  _currentSessionId = session.id
  _state = result.state
  _lastLineTs = Date.now()
  applyEffects(result.effects, session)
  logger.info('session', 'opened', { sessionId: session.id })
  return session
}

export async function startSession() {
  if (_state === ACTIVE) {
    // Return full session record so caller can read session.body
    const sessions = await getAllSessions()
    const session = sessions.find(s => s.id === _currentSessionId)
    return session ?? { id: _currentSessionId }
  }
  return _doOpen()
}

export async function endSession() {
  if (_state !== ACTIVE) return
  const result = transition(_state, 'closeSession')
  await closeSession(_currentSessionId)
  applyEffects(result.effects)
  _state = result.state

  const confirm = transition(_state, 'confirmClose')
  applyEffects(confirm.effects)
  _state = confirm.state
  _currentSessionId = null
  logger.info('session', 'closed')
}

export async function addLine(text, location, locationStatus) {
  if (_state !== ACTIVE) throw new Error('No active session')
  const result = transition(_state, 'appendLine')
  const line = await appendLine(_currentSessionId, text, location, locationStatus)
  applyEffects(result.effects)
  _lastLineTs = Date.now()
  return line
}

export function getState() { return _state }
export function getCurrentSessionId() { return _currentSessionId }

// Only exported in dev/test — stripped from production builds
export const _resetForTesting = import.meta.env.DEV
  ? () => {
      _state = IDLE
      _currentSessionId = null
      _lastLineTs = null
      if (_inactivityTimer) { clearInterval(_inactivityTimer); _inactivityTimer = null }
    }
  : /* c8 ignore next */ () => {}

// Stamp heartbeat on background — gap detection handles close on next open.
// Do NOT call closeSession here: it sets endedAt then heartbeat re-points to a
// closed session, causing initSession to resume it as "active" with endedAt set.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _state === ACTIVE) {
      writeHeartbeat()
      logger.info('session', 'heartbeat_on_background')
    }
  })
}
