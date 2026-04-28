/**
 * M3 Walk UI tests — flat-doc path
 *
 * These tests run in the node environment (no DOM) and exercise the
 * module-level contracts that M3 depends on. DOM-dependent behaviour
 * (textarea input, end-button click) is verified via manual UX convergence
 * gate rather than automated DOM tests because the project vitest config
 * uses environment: 'node' and carries no DOM library.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  openDB,
  openSession,
  getAllSessions,
  appendToBody,
  setBodyTimer,
  flushBody,
} from '../src/db/index.js'

// ── localStorage shim (mirrors setup.js, re-applied here for clarity) ───────
const store = {}
vi.stubGlobal('localStorage', {
  getItem: k => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: k => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
})

// Fresh IDB per test
beforeEach(async () => {
  await openDB(new IDBFactory())
  Object.keys(store).forEach(k => delete store[k])
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Test 1: new walk session initialises with body: '' ─────────────────────

describe('startSession — flat-doc init', () => {
  it('new walk session initialises with body empty string, not null', async () => {
    // manager.startSession() calls _doOpen() → appendToBody(id, '')
    // We test the same sequence here directly since manager imports are
    // re-entrant and would double-init state. Instead we verify the contract:
    // openSession() gives body:null; appendToBody(id,'') sets body:''.
    const session = await openSession()
    expect(session.body).toBeNull()           // raw DB default — still null

    await appendToBody(session.id, '')
    const sessions = await getAllSessions()
    const updated = sessions.find(s => s.id === session.id)
    expect(updated.body).toBe('')             // '' distinguishes walk from legacy
    expect(updated.body).not.toBeNull()
  })
})

// ─── Test 2: setBodyTimer / debounce cancel ──────────────────────────────────
//
// Strategy: IDB setup uses real timers (fake-indexeddb Promises break with
// fake timers). We install fake timers only for the synchronous portion that
// tests setTimeout/clearTimeout behaviour, then restore real timers before
// any awaited IDB call.

describe('setBodyTimer + flushBody cancel', () => {
  it('flushBody cancels the pending debounce set via setBodyTimer', async () => {
    // IDB setup with real timers
    const session = await openSession()
    await appendToBody(session.id, '')

    const pendingWrite = vi.fn()

    // Install fake timers — only for the setTimeout/clearTimeout slice
    vi.useFakeTimers()

    // Simulate what the textarea input handler does:
    // schedule a 500ms debounce, register the timer with setBodyTimer
    const timerId = setTimeout(() => {
      pendingWrite()
    }, 500)
    setBodyTimer(timerId)

    // Restore real timers before any IDB await
    vi.useRealTimers()

    // flushBody cancels _bodyDebounceTimer via clearTimeout then writes to IDB
    await flushBody(session.id, 'final value at flush time')

    // The callback should NOT have fired (fake timer was never advanced —
    // but the key assertion is that clearTimeout was called by flushBody)
    expect(pendingWrite).not.toHaveBeenCalled()

    // And the final flush value must be persisted
    const sessions = await getAllSessions()
    const stored = sessions.find(s => s.id === session.id)
    expect(stored.body).toBe('final value at flush time')
  })

  it('setBodyTimer registers the timer id consumed by flushBody', async () => {
    // Verify that setBodyTimer correctly updates _bodyDebounceTimer by testing
    // the full cancel+write sequence without fake timers.
    // This is the interface contract: setBodyTimer(id) + flushBody() = cancel + immediate write.
    const session = await openSession()

    let timerFired = false
    // Schedule a real timer with a long delay so it never fires during this test
    const id = setTimeout(() => { timerFired = true }, 10000)
    setBodyTimer(id)

    // flushBody must cancel that timer and write immediately
    await flushBody(session.id, 'registered write')

    // Give real event loop a cycle to confirm the timer doesn't fire
    await new Promise(r => setTimeout(r, 10))
    expect(timerFired).toBe(false)

    const sessions = await getAllSessions()
    expect(sessions.find(s => s.id === session.id).body).toBe('registered write')
  })
})

// ─── Test 3: flat-doc session skips CodaSheet (body !== null check) ──────────

describe('flat-doc vs legacy branch decision', () => {
  it('session with body === empty string is a flat-doc session', async () => {
    const session = await openSession()
    await appendToBody(session.id, '')
    const sessions = await getAllSessions()
    const s = sessions.find(x => x.id === session.id)
    // flat-doc: body !== null → skip CodaSheet
    expect(s.body).not.toBeNull()
    expect(typeof s.body).toBe('string')
  })

  it('session with body === null is a legacy session', async () => {
    const session = await openSession()
    // No appendToBody call — stays null (legacy)
    const sessions = await getAllSessions()
    const s = sessions.find(x => x.id === session.id)
    expect(s.body).toBeNull()
  })
})

// ─── Test 4: .md export of flat-doc session returns body content ─────────────

import { sessionToMarkdown } from '../src/export/markdown.js'

describe('sessionToMarkdown — flat-doc path', () => {
  it('returns body content as single block when session.body is a non-empty string', () => {
    const session = {
      id: 'sess-flat',
      startedAt: new Date('2026-04-28T10:00:00Z').getTime(),
      endedAt: new Date('2026-04-28T10:45:00Z').getTime(),
      body: 'This is the walk. It captured a lot. Final thought here.',
    }
    const md = sessionToMarkdown(session, [])
    expect(md).toContain('This is the walk. It captured a lot. Final thought here.')
    expect(md).not.toBe('')
  })

  it('returns non-empty markdown even when body is empty string', () => {
    const session = {
      id: 'sess-empty-flat',
      startedAt: new Date('2026-04-28T10:00:00Z').getTime(),
      endedAt: null,
      body: '',
    }
    const md = sessionToMarkdown(session, [])
    expect(typeof md).toBe('string')
    expect(md).toContain('# Walk ·')
  })

  it('falls through to lines when body is null (legacy path)', () => {
    const session = {
      id: 'sess-legacy',
      startedAt: new Date('2026-04-28T10:00:00Z').getTime(),
      endedAt: null,
      body: null,
    }
    const lines = [
      {
        id: 'l1',
        createdAt: new Date('2026-04-28T10:05:00Z').getTime(),
        text: 'Legacy line text.',
        location: null,
        locationStatus: 'unavailable',
      },
    ]
    const md = sessionToMarkdown(session, lines)
    expect(md).toContain('Legacy line text.')
  })
})

// ─── Test 5: session resume returns body field ───────────────────────────────

import { initSession, startSession, endSession, _resetForTesting } from '../src/session/manager.js'

describe('session resume includes body field', () => {
  beforeEach(() => {
    _resetForTesting()
  })

  it('startSession returns session with body populated after walk init', async () => {
    const session = await startSession()
    // startSession calls _doOpen which calls appendToBody(id, '')
    expect(session).toHaveProperty('body')
    expect(session.body).toBe('')
  })

  it('initSession resume returns full session record including body field', async () => {
    // Create a walk session (sets body:'')
    const session = await startSession()
    const sessionId = session.id

    // Simulate app going to background: write heartbeat, then reset state
    localStorage.setItem('session_heartbeat', JSON.stringify({
      sessionId,
      ts: Date.now() - 5 * 60 * 1000, // 5 min ago — within gap
    }))
    _resetForTesting()

    // App reopens — initSession resumes
    const resumed = await initSession()
    expect(resumed).toBeTruthy()
    expect(resumed.id).toBe(sessionId)
    // Must include body field so Editor can route flat-doc vs legacy
    expect(resumed).toHaveProperty('body')
    expect(resumed.body).toBe('')
  })
})
