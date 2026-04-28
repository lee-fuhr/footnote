import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { openDB } from '../src/db/index.js'

// Stub localStorage before importing manager
const mockStorage = {}
vi.stubGlobal('localStorage', {
  getItem: key => mockStorage[key] ?? null,
  setItem: (key, val) => { mockStorage[key] = val },
  removeItem: key => { delete mockStorage[key] },
})

const { initSession, startSession, endSession, addLine, getState, getCurrentSessionId, _resetForTesting } =
  await import('../src/session/manager.js')

beforeEach(async () => {
  await openDB(new IDBFactory())
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
  _resetForTesting()
})

describe('startSession', () => {
  it('opens a session and sets state to ACTIVE', async () => {
    const session = await startSession()
    expect(session.id).toBeTruthy()
    expect(getState()).toBe('ACTIVE')
  })

  it('is idempotent when already ACTIVE', async () => {
    const s1 = await startSession()
    const s2 = await startSession()
    expect(s1.id).toBe(s2.id)
    expect(getState()).toBe('ACTIVE')
  })
})

describe('addLine', () => {
  it('adds a line to the active session', async () => {
    await startSession()
    const line = await addLine('test thought', null, 'unavailable')
    expect(line.text).toBe('test thought')
    expect(line.sessionId).toBe(getCurrentSessionId())
  })

  it('throws when no active session', async () => {
    await expect(addLine('no session', null, 'unavailable')).rejects.toThrow('No active session')
  })
})

describe('endSession', () => {
  it('closes session and returns to IDLE', async () => {
    await startSession()
    expect(getState()).toBe('ACTIVE')
    await endSession()
    expect(getState()).toBe('IDLE')
    expect(getCurrentSessionId()).toBeNull()
  })

  it('is a no-op when already IDLE', async () => {
    await endSession()
    expect(getState()).toBe('IDLE')
  })
})

describe('initSession', () => {
  it('returns null when no heartbeat and no active session in DB', async () => {
    const result = await initSession()
    expect(result).toBeNull()
    expect(getState()).toBe('IDLE')
  })

  it('resumes session when heartbeat is within 30 min', async () => {
    // Create a real session in IDB
    const session = await startSession()
    const sessionId = session.id

    // Simulate app background — write heartbeat, then reset state (app killed)
    localStorage.setItem('session_heartbeat', JSON.stringify({
      sessionId,
      ts: Date.now() - 5 * 60 * 1000, // 5 min ago
    }))
    _resetForTesting()

    // App reopens — initSession should resume
    const resumed = await initSession()
    expect(resumed).toBeTruthy()
    expect(resumed.id).toBe(sessionId)
    expect(getState()).toBe('ACTIVE')
  })

  it('opens new session when heartbeat gap exceeds 30 min', async () => {
    // Create old session in IDB
    const oldSession = await startSession()

    // Simulate stale heartbeat
    localStorage.setItem('session_heartbeat', JSON.stringify({
      sessionId: oldSession.id,
      ts: Date.now() - 35 * 60 * 1000, // 35 min ago
    }))
    _resetForTesting()

    // App reopens — should detect gap and open new session
    const newSessionCb = vi.fn()
    const result = await initSession(newSessionCb)
    expect(result).toBeTruthy()
    expect(result.id).not.toBe(oldSession.id)
    expect(newSessionCb).toHaveBeenCalledWith(expect.anything(), 'gap')
    expect(getState()).toBe('ACTIVE')
  })
})
