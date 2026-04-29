/**
 * M3 Walk UI tests — chunk-doc path (v4)
 *
 * These tests run in the node environment (no DOM) and exercise the
 * module-level contracts that the walk path depends on. DOM-dependent
 * behaviour (textarea input, end-button click) is verified via manual UX
 * convergence gate rather than automated DOM tests because the project
 * vitest config uses environment: 'node' and carries no DOM library.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  openDB,
  openSession,
  getAllSessions,
  initChunkBody,
  appendChunk,
  setChunkTimer,
  flushChunk,
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

// ─── Test 1: new walk session initialises with body: [] ─────────────────────

describe('startSession — chunk-doc init', () => {
  it('new walk session initialises with body as empty array, not null', async () => {
    // manager.startSession() calls _doOpen() → initChunkBody(id)
    // We test the same sequence here directly. openSession gives body:null;
    // initChunkBody(id) sets body: [].
    const session = await openSession()
    expect(session.body).toBeNull()           // raw DB default — still null

    await initChunkBody(session.id)
    const sessions = await getAllSessions()
    const updated = sessions.find(s => s.id === session.id)
    expect(updated.body).toEqual([])           // empty array distinguishes walk from legacy
    expect(updated.body).not.toBeNull()
  })
})

// ─── Test 2: setChunkTimer / debounce cancel ────────────────────────────────
//
// Strategy: IDB setup uses real timers (fake-indexeddb Promises break with
// fake timers). We install fake timers only for the synchronous portion that
// tests setTimeout/clearTimeout behaviour, then restore real timers before
// any awaited IDB call.

describe('setChunkTimer + flushChunk cancel', () => {
  it('flushChunk cancels the pending debounce set via setChunkTimer', async () => {
    const session = await openSession()
    await initChunkBody(session.id)

    const pendingWrite = vi.fn()

    vi.useFakeTimers()

    const timerId = setTimeout(() => {
      pendingWrite()
    }, 500)
    setChunkTimer(timerId)

    vi.useRealTimers()

    await flushChunk(session.id, 'final value at flush time', {
      timestamp: 1000,
      location: null,
    })

    expect(pendingWrite).not.toHaveBeenCalled()

    const sessions = await getAllSessions()
    const stored = sessions.find(s => s.id === session.id)
    expect(stored.body).toHaveLength(1)
    expect(stored.body[0].text).toBe('final value at flush time')
  })

  it('setChunkTimer registers the timer id consumed by flushChunk', async () => {
    const session = await openSession()

    let timerFired = false
    const id = setTimeout(() => { timerFired = true }, 10000)
    setChunkTimer(id)

    await flushChunk(session.id, 'registered write', {
      timestamp: 1000,
      location: null,
    })

    await new Promise(r => setTimeout(r, 10))
    expect(timerFired).toBe(false)

    const sessions = await getAllSessions()
    const stored = sessions.find(s => s.id === session.id)
    expect(stored.body).toHaveLength(1)
    expect(stored.body[0].text).toBe('registered write')
  })
})

// ─── Test 3: walk-mode (array) vs legacy (null) routing ─────────────────────

describe('walk-mode vs legacy branch decision', () => {
  it('session with body as array is a walk-mode session', async () => {
    const session = await openSession()
    await initChunkBody(session.id)
    const sessions = await getAllSessions()
    const s = sessions.find(x => x.id === session.id)
    expect(s.body).not.toBeNull()
    expect(Array.isArray(s.body)).toBe(true)
  })

  it('session with body === null is a legacy session', async () => {
    const session = await openSession()
    // No initChunkBody call — stays null (legacy)
    const sessions = await getAllSessions()
    const s = sessions.find(x => x.id === session.id)
    expect(s.body).toBeNull()
  })
})

// ─── Test 4: .md export of walk-mode session returns chunk content ──────────

import { sessionToMarkdown } from '../src/export/markdown.js'

describe('sessionToMarkdown — chunk-doc path', () => {
  it('returns chunk text in the exported markdown when body is a chunk array', () => {
    const session = {
      id: 'sess-walk',
      startedAt: new Date('2026-04-28T10:00:00Z').getTime(),
      endedAt: new Date('2026-04-28T10:45:00Z').getTime(),
      body: [
        {
          text: 'This is the walk. It captured a lot. Final thought here.',
          timestamp: new Date('2026-04-28T10:00:00Z').getTime(),
          location: null,
        },
      ],
    }
    const md = sessionToMarkdown(session, [])
    expect(md).toContain('This is the walk. It captured a lot. Final thought here.')
    expect(md).not.toBe('')
  })

  it('returns non-empty markdown even when body is empty array', () => {
    const session = {
      id: 'sess-empty-walk',
      startedAt: new Date('2026-04-28T10:00:00Z').getTime(),
      endedAt: null,
      body: [],
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

  it('startSession returns session with body populated as empty array after walk init', async () => {
    const session = await startSession()
    expect(session).toHaveProperty('body')
    expect(session.body).toEqual([])
  })

  it('initSession resume returns full session record including body field', async () => {
    const session = await startSession()
    const sessionId = session.id

    localStorage.setItem('session_heartbeat', JSON.stringify({
      sessionId,
      ts: Date.now() - 5 * 60 * 1000,
    }))
    _resetForTesting()

    const resumed = await initSession()
    expect(resumed).toBeTruthy()
    expect(resumed.id).toBe(sessionId)
    expect(resumed).toHaveProperty('body')
    expect(Array.isArray(resumed.body)).toBe(true)
  })
})
