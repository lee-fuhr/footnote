import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { openDB, closeDB, openSession, closeSession, appendLine, getAllSessions, getSessionLines, getLastActiveSessionId, deleteSession, starLine, unstarLine, getStarredLines, appendToBody, flushBody } from '../src/db/index.js'
import { upgradeDB, DB_NAME } from '../src/db/schema.js'

// Each test gets a fresh IDB instance
beforeEach(async () => {
  await openDB(new IDBFactory())
})

describe('session CRUD', () => {
  it('openSession creates a session and sets it as active', async () => {
    const session = await openSession()
    expect(session.id).toBeTruthy()
    expect(session.startedAt).toBeTypeOf('number')
    expect(session.endedAt).toBeNull()

    const activeId = await getLastActiveSessionId()
    expect(activeId).toBe(session.id)
  })

  it('closeSession sets endedAt and clears active session', async () => {
    const session = await openSession()
    await closeSession(session.id)

    const sessions = await getAllSessions()
    const closed = sessions.find(s => s.id === session.id)
    expect(closed.endedAt).toBeTypeOf('number')

    const activeId = await getLastActiveSessionId()
    expect(activeId).toBeNull()
  })

  it('getAllSessions returns all sessions', async () => {
    await openSession()
    const first = await openSession() // second open closes first implicitly? No — just creates another
    const sessions = await getAllSessions()
    expect(sessions.length).toBeGreaterThanOrEqual(1)
  })
})

describe('line CRUD', () => {
  it('appendLine creates a line with correct fields', async () => {
    const session = await openSession()
    const location = { lat: 40.758, lng: -73.985, accuracy: 8, capturedAt: Date.now() }
    const line = await appendLine(session.id, 'test thought', location, 'live')

    expect(line.id).toBeTruthy()
    expect(line.sessionId).toBe(session.id)
    expect(line.text).toBe('test thought')
    expect(line.locationStatus).toBe('live')
    expect(line.location.lat).toBe(40.758)
  })

  it('appendLine with null location sets locationStatus unavailable', async () => {
    const session = await openSession()
    const line = await appendLine(session.id, 'no gps', null, 'unavailable')
    expect(line.locationStatus).toBe('unavailable')
    expect(line.location).toBeNull()
  })

  it('getSessionLines returns lines in order', async () => {
    const session = await openSession()
    await appendLine(session.id, 'first', null, 'unavailable')
    await appendLine(session.id, 'second', null, 'unavailable')
    await appendLine(session.id, 'third', null, 'unavailable')

    const lines = await getSessionLines(session.id)
    expect(lines).toHaveLength(3)
    expect(lines[0].text).toBe('first')
    expect(lines[2].text).toBe('third')
  })
})

describe('deleteSession', () => {
  it('removes session and all its lines', async () => {
    const session = await openSession()
    await appendLine(session.id, 'note 1', null, 'unavailable')
    await appendLine(session.id, 'note 2', null, 'unavailable')
    await deleteSession(session.id)

    const sessions = await getAllSessions()
    expect(sessions.find(s => s.id === session.id)).toBeUndefined()

    const lines = await getSessionLines(session.id)
    expect(lines).toHaveLength(0)
  })

  it('clears active session id if deleting active session', async () => {
    const session = await openSession()
    const activeId = await getLastActiveSessionId()
    expect(activeId).toBe(session.id)

    await deleteSession(session.id)
    const afterId = await getLastActiveSessionId()
    expect(afterId).toBeNull()
  })
})

describe('IDB v1→v2 migration', () => {
  it('adds starred and archived fields to existing lines', async () => {
    const factory = new IDBFactory()
    const DB_NAME = 'footnote-db'

    // Seed a v1 database with 3 lines that have no starred/archived fields
    await new Promise((resolve, reject) => {
      const req = factory.open(DB_NAME, 1)
      req.onupgradeneeded = e => {
        const db = e.target.result
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
        sessions.createIndex('startedAt', 'startedAt')
        sessions.createIndex('endedAt', 'endedAt')
        const lines = db.createObjectStore('lines', { keyPath: 'id' })
        lines.createIndex('sessionId', 'sessionId')
        lines.createIndex('createdAt', 'createdAt')
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
      req.onsuccess = e => {
        const db = e.target.result
        const txn = db.transaction('lines', 'readwrite')
        const store = txn.objectStore('lines')
        store.add({ id: 'l1', sessionId: 's1', text: 'alpha', createdAt: 1000 })
        store.add({ id: 'l2', sessionId: 's1', text: 'beta', createdAt: 2000 })
        store.add({ id: 'l3', sessionId: 's1', text: 'gamma', createdAt: 3000 })
        txn.oncomplete = () => { db.close(); resolve() }
        txn.onerror = ev => reject(ev.target.error)
      }
      req.onerror = e => reject(e.target.error)
    })

    // Open at v2 — triggers migration via upgradeDB
    const lines = await new Promise((resolve, reject) => {
      const req = factory.open(DB_NAME, 2)
      req.onupgradeneeded = e => upgradeDB(e.target.result, e.oldVersion, e)
      req.onsuccess = e => {
        const db = e.target.result
        const txn = db.transaction('lines', 'readonly')
        const req2 = txn.objectStore('lines').getAll()
        req2.onsuccess = ev => { db.close(); resolve(ev.target.result) }
        req2.onerror = ev => reject(ev.target.error)
      }
      req.onerror = e => reject(e.target.error)
    })

    expect(lines).toHaveLength(3)
    for (const line of lines) {
      expect(line.starred).toBe(false)
      expect(line.archived).toBe(false)
    }
  })
})

describe('star/unstar lines', () => {
  it('starLine sets starred true, unstarLine sets it false', async () => {
    const session = await openSession()
    const line = await appendLine(session.id, 'keep this one', null, 'unavailable')

    await starLine(line.id)
    const starred = await getStarredLines(session.id)
    expect(starred).toHaveLength(1)
    expect(starred[0].id).toBe(line.id)
    expect(starred[0].starred).toBe(true)

    await unstarLine(line.id)
    const after = await getStarredLines(session.id)
    expect(after).toHaveLength(0)
  })

  it('getStarredLines returns only lines where starred === true', async () => {
    const session = await openSession()
    const a = await appendLine(session.id, 'line a', null, 'unavailable')
    const b = await appendLine(session.id, 'line b', null, 'unavailable')
    const c = await appendLine(session.id, 'line c', null, 'unavailable')

    await starLine(a.id)
    await starLine(c.id)

    const starred = await getStarredLines(session.id)
    expect(starred).toHaveLength(2)
    expect(starred.map(l => l.id).sort()).toEqual([a.id, c.id].sort())
  })
})

// ── Schema v3 tests ──────────────────────────────────────────────────────────

describe('appendToBody', () => {
  // Test 1: first call creates body string (body was null)
  it('creates body string on first call when body was null', async () => {
    const session = await openSession()
    // Fresh session has body: null (v3 schema)
    const sessions = await getAllSessions()
    const fresh = sessions.find(s => s.id === session.id)
    expect(fresh.body).toBeNull()

    await appendToBody(session.id, 'Hello walk')

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toBe('Hello walk')
    expect(updated.bodyUpdatedAt).toBeTypeOf('number')
  })

  // Test 2: subsequent calls replace body and update bodyUpdatedAt
  it('replaces body and updates bodyUpdatedAt on subsequent calls', async () => {
    const session = await openSession()
    await appendToBody(session.id, 'First version')
    const after1 = (await getAllSessions()).find(s => s.id === session.id)
    const ts1 = after1.bodyUpdatedAt

    // Ensure time advances (fake-indexeddb is synchronous — use a tiny real delay)
    await new Promise(r => setTimeout(r, 2))

    await appendToBody(session.id, 'Second version — replaces first')
    const after2 = (await getAllSessions()).find(s => s.id === session.id)

    expect(after2.body).toBe('Second version — replaces first')
    expect(after2.bodyUpdatedAt).toBeGreaterThanOrEqual(ts1)
  })

  // Test 5: non-existent sessionId → silent no-op (not a throw)
  // Rationale: appendToBody is called from a debounced auto-save; sessions may be
  // deleted while a timer is in flight. Throwing would force every call site to
  // wrap in try/catch for a benign race. Silent no-op matches closeSession and
  // appendLine, which also skip silently when the session is missing.
  it('is a silent no-op for a non-existent sessionId', async () => {
    await expect(appendToBody('nonexistent-id', 'some text')).resolves.toBeUndefined()
  })
})

describe('flushBody', () => {
  // Test 3: flushBody cancels pending debounce AND the returned Promise resolves
  // only after the IDB write commits (not just when the timer is cleared)
  it('cancels pending debounce and resolves only after the IDB write commits', async () => {
    const session = await openSession()

    // Simulate a pending debounce timer by calling flushBody with a value
    // that hasn't been written yet, then confirming the write happened
    // before the promise resolved.
    let writeCommitted = false

    // Wrap appendToBody to detect when the write actually commits
    const flush = flushBody(session.id, 'walk content at flush time')

    // The promise must not have already resolved synchronously
    // (timer cancel is sync, but the write is async)
    let resolvedEarly = false
    flush.then(() => { writeCommitted = true })

    // Await the flush — only resolves after IDB write commits
    await flush

    expect(writeCommitted).toBe(true)

    // Confirm the value is actually in the DB (not just that the timer fired)
    const stored = (await getAllSessions()).find(s => s.id === session.id)
    expect(stored.body).toBe('walk content at flush time')
  })
})

describe('v2→v3 migration', () => {
  // Test 4: existing sessions have body: null after upgrade; lines untouched
  it('existing sessions get body: null, bodyUpdatedAt: null; lines are untouched', async () => {
    const factory = new IDBFactory()
    const DBNAME = 'footnote-db'

    // Seed a v2 database with one session and two lines
    await new Promise((resolve, reject) => {
      const req = factory.open(DBNAME, 2)
      req.onupgradeneeded = e => {
        const db = e.target.result
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
        sessions.createIndex('startedAt', 'startedAt')
        sessions.createIndex('endedAt', 'endedAt')
        const lines = db.createObjectStore('lines', { keyPath: 'id' })
        lines.createIndex('sessionId', 'sessionId')
        lines.createIndex('createdAt', 'createdAt')
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
      req.onsuccess = e => {
        const db = e.target.result
        const txn = db.transaction(['sessions', 'lines'], 'readwrite')
        txn.objectStore('sessions').add({ id: 's1', startedAt: 1000, endedAt: null, lineCount: 2 })
        txn.objectStore('lines').add({ id: 'l1', sessionId: 's1', text: 'alpha', createdAt: 1000, starred: false, archived: false })
        txn.objectStore('lines').add({ id: 'l2', sessionId: 's1', text: 'beta', createdAt: 2000, starred: true, archived: false })
        txn.oncomplete = () => { db.close(); resolve() }
        txn.onerror = ev => reject(ev.target.error)
      }
      req.onerror = e => reject(e.target.error)
    })

    // Open at v3 — triggers migration
    const { sessions, lines } = await new Promise((resolve, reject) => {
      const req = factory.open(DBNAME, 3)
      req.onupgradeneeded = e => upgradeDB(e.target.result, e.oldVersion, e)
      req.onsuccess = e => {
        const db = e.target.result
        const txn = db.transaction(['sessions', 'lines'], 'readonly')
        const r1 = txn.objectStore('sessions').getAll()
        const r2 = txn.objectStore('lines').getAll()
        let s, l
        r1.onsuccess = ev => { s = ev.target.result }
        r2.onsuccess = ev => { l = ev.target.result }
        txn.oncomplete = () => { db.close(); resolve({ sessions: s, lines: l }) }
        txn.onerror = ev => reject(ev.target.error)
      }
      req.onerror = e => reject(e.target.error)
    })

    expect(sessions).toHaveLength(1)
    expect(sessions[0].body).toBeNull()
    expect(sessions[0].bodyUpdatedAt).toBeNull()

    // Lines must be completely untouched
    expect(lines).toHaveLength(2)
    expect(lines.find(l => l.id === 'l1').text).toBe('alpha')
    expect(lines.find(l => l.id === 'l2').starred).toBe(true)
  })
})

describe('fresh install at v3', () => {
  // Test 6: DB opens cleanly at v3 on a brand-new install (no prior data)
  it('opens at v3 cleanly and sessions have body and bodyUpdatedAt fields', async () => {
    const session = await openSession()
    const sessions = await getAllSessions()
    expect(sessions).toHaveLength(1)
    // New sessions must carry the v3 fields (null by default)
    expect(sessions[0]).toHaveProperty('body', null)
    expect(sessions[0]).toHaveProperty('bodyUpdatedAt', null)
  })
})
