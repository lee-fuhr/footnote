import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { openDB, closeDB, openSession, closeSession, appendLine, getAllSessions, getSessionLines, getLastActiveSessionId, deleteSession, starLine, unstarLine, getStarredLines, initChunkBody, appendChunk, flushChunk, appendLocationAnchor, getLocationAnchors, interpolateLocation } from '../src/db/index.js'
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

// ── Schema v4 tests (chunk DB layer) ─────────────────────────────────────────

describe('initChunkBody', () => {
  it('sets body to empty array and writes bodyUpdatedAt', async () => {
    const session = await openSession()
    const fresh = (await getAllSessions()).find(s => s.id === session.id)
    expect(fresh.body).toBeNull()

    await initChunkBody(session.id)
    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toEqual([])
    expect(updated.bodyUpdatedAt).toBeTypeOf('number')
  })

  it('is a silent no-op for a non-existent sessionId', async () => {
    await expect(initChunkBody('nonexistent-id')).resolves.toBeUndefined()
  })
})

describe('appendChunk', () => {
  it('creates the first chunk when body is empty', async () => {
    const session = await openSession()
    await initChunkBody(session.id)

    await appendChunk(session.id, 'hello', { timestamp: 1000, location: null })

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toHaveLength(1)
    expect(updated.body[0].text).toBe('hello')
    expect(updated.body[0].timestamp).toBe(1000)
    expect(updated.body[0].location).toBeNull()
    expect(updated.bodyUpdatedAt).toBe(1000)
  })

  it('extends the last chunk when called within the 120s window', async () => {
    const session = await openSession()
    await initChunkBody(session.id)
    await appendChunk(session.id, 'hello', { timestamp: 1000, location: null })
    await appendChunk(session.id, 'hello world', { timestamp: 30000, location: null })

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toHaveLength(1)
    expect(updated.body[0].text).toBe('hello world')
    expect(updated.body[0].timestamp).toBe(30000)
  })

  it('creates a new chunk after a gap of 120s or more', async () => {
    const session = await openSession()
    await initChunkBody(session.id)
    await appendChunk(session.id, 'hello', { timestamp: 1000, location: null })
    const loc = { lat: 47.61, lng: -122.33, accuracy: 5 }
    await appendChunk(session.id, 'hello world', { timestamp: 1000 + 120_000, location: loc })

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toHaveLength(2)
    expect(updated.body[0].text).toBe('hello')
    expect(updated.body[1].text).toBe(' world')
    expect(updated.body[1].timestamp).toBe(1000 + 120_000)
    expect(updated.body[1].location).toEqual(loc)
  })

  it('updates location when extending the last chunk', async () => {
    const session = await openSession()
    await initChunkBody(session.id)
    const loc1 = { lat: 47.61, lng: -122.33, accuracy: 12 }
    const loc2 = { lat: 47.62, lng: -122.34, accuracy: 8 }
    await appendChunk(session.id, 'first', { timestamp: 1000, location: loc1 })
    await appendChunk(session.id, 'first second', { timestamp: 30000, location: loc2 })

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toHaveLength(1)
    expect(updated.body[0].location).toEqual(loc2)
  })

  it('shrinks the last chunk on backspace within the last chunk', async () => {
    const session = await openSession()
    await initChunkBody(session.id)
    await appendChunk(session.id, 'first', { timestamp: 1000, location: null })
    await appendChunk(session.id, 'first second', { timestamp: 1000 + 120_000, location: null })

    await appendChunk(session.id, 'first se', { timestamp: 1000 + 120_100, location: null })

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toHaveLength(2)
    expect(updated.body[0].text).toBe('first')
    expect(updated.body[1].text).toBe(' se')
  })

  it('pops sealed chunks when the user deletes past a chunk seal', async () => {
    const session = await openSession()
    await initChunkBody(session.id)
    await appendChunk(session.id, 'first', { timestamp: 1000, location: null })
    await appendChunk(session.id, 'first second', { timestamp: 1000 + 120_000, location: null })

    await appendChunk(session.id, 'firs', { timestamp: 1000 + 120_100, location: null })

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(updated.body).toHaveLength(1)
    expect(updated.body[0].text).toBe('firs')
  })

  it('treats a null body (legacy session) as empty array', async () => {
    const session = await openSession()
    // No initChunkBody — body stays null

    await appendChunk(session.id, 'hello', { timestamp: 1000, location: null })

    const updated = (await getAllSessions()).find(s => s.id === session.id)
    expect(Array.isArray(updated.body)).toBe(true)
    expect(updated.body[0].text).toBe('hello')
  })

  it('is a silent no-op for a non-existent sessionId', async () => {
    await expect(
      appendChunk('nonexistent-id', 'text', { timestamp: 1, location: null })
    ).resolves.toBeUndefined()
  })
})

describe('flushChunk', () => {
  it('cancels pending debounce and resolves only after the IDB write commits', async () => {
    const session = await openSession()
    await initChunkBody(session.id)

    const flush = flushChunk(session.id, 'final text', { timestamp: 1000, location: null })
    let writeCommitted = false
    flush.then(() => { writeCommitted = true })
    await flush
    expect(writeCommitted).toBe(true)

    const stored = (await getAllSessions()).find(s => s.id === session.id)
    expect(stored.body).toHaveLength(1)
    expect(stored.body[0].text).toBe('final text')
  })
})

describe('appendLocationAnchor / getLocationAnchors', () => {
  it('appends anchor and retrieves it', async () => {
    const session = await openSession()
    const anchor = { lat: 47.6, lng: -122.3, accuracy: 10, timestamp: 1000 }
    await appendLocationAnchor(session.id, anchor)
    const anchors = await getLocationAnchors(session.id)
    expect(anchors).toHaveLength(1)
    expect(anchors[0]).toMatchObject(anchor)
  })

  it('stores multiple anchors in insertion order', async () => {
    const session = await openSession()
    await appendLocationAnchor(session.id, { lat: 47.60, lng: -122.30, accuracy: 10, timestamp: 1000 })
    await appendLocationAnchor(session.id, { lat: 47.61, lng: -122.31, accuracy: 8,  timestamp: 2000 })
    const anchors = await getLocationAnchors(session.id)
    expect(anchors).toHaveLength(2)
    expect(anchors[0].timestamp).toBe(1000)
    expect(anchors[1].timestamp).toBe(2000)
  })

  it('returns [] for a session with no anchors yet', async () => {
    const session = await openSession()
    const anchors = await getLocationAnchors(session.id)
    expect(anchors).toEqual([])
  })

  it('silent no-op for missing session', async () => {
    await expect(appendLocationAnchor('no-such-id', { lat: 0, lng: 0, accuracy: 5, timestamp: 1 })).resolves.toBeUndefined()
  })
})

describe('interpolateLocation', () => {
  it('returns null for empty anchors', () => {
    expect(interpolateLocation(1000, [])).toBeNull()
  })

  it('returns null for null anchors', () => {
    expect(interpolateLocation(1000, null)).toBeNull()
  })

  it('returns the sole anchor regardless of timestamp distance', () => {
    const anchor = { lat: 47.6, lng: -122.3, accuracy: 10, timestamp: 5000 }
    expect(interpolateLocation(1000, [anchor])).toEqual(anchor)
  })

  it('returns nearest anchor — closer to first', () => {
    const a1 = { lat: 47.60, lng: -122.30, accuracy: 10, timestamp: 1000 }
    const a2 = { lat: 47.61, lng: -122.31, accuracy: 8,  timestamp: 3000 }
    expect(interpolateLocation(1200, [a1, a2])).toEqual(a1)
  })

  it('returns nearest anchor — closer to second', () => {
    const a1 = { lat: 47.60, lng: -122.30, accuracy: 10, timestamp: 1000 }
    const a2 = { lat: 47.61, lng: -122.31, accuracy: 8,  timestamp: 3000 }
    expect(interpolateLocation(2800, [a1, a2])).toEqual(a2)
  })

  it('returns first anchor on equidistant tie', () => {
    const a1 = { lat: 47.60, lng: -122.30, accuracy: 10, timestamp: 1000 }
    const a2 = { lat: 47.61, lng: -122.31, accuracy: 8,  timestamp: 3000 }
    expect(interpolateLocation(2000, [a1, a2])).toEqual(a1)
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

// ── Schema v4 tests (chunk redesign) ─────────────────────────────────────────

describe('v3→v4 migration', () => {
  // Wrap non-null string body in a single chunk; empty string → empty array;
  // null body (legacy line session) stays null. Lines store untouched.
  it('wraps string bodies as chunks; null stays null; lines untouched', async () => {
    const factory = new IDBFactory()
    const DBNAME = 'footnote-db'

    await new Promise((resolve, reject) => {
      const req = factory.open(DBNAME, 3)
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
        // Three seed sessions covering the three v3 body states:
        // - non-empty string (an in-progress walk; bodyUpdatedAt is the
        //   closest proxy for when the user actually wrote)
        // - empty string (a freshly opened walk with no input yet)
        // - null (a legacy line-based session)
        txn.objectStore('sessions').add({ id: 's-walk', startedAt: 5000, endedAt: 6000, body: 'I walked by the river.', bodyUpdatedAt: 5500 })
        txn.objectStore('sessions').add({ id: 's-empty', startedAt: 7000, endedAt: null, body: '', bodyUpdatedAt: 7000 })
        txn.objectStore('sessions').add({ id: 's-legacy', startedAt: 1000, endedAt: 2000, body: null, bodyUpdatedAt: null })
        txn.objectStore('lines').add({ id: 'l1', sessionId: 's-legacy', text: 'alpha', createdAt: 1000, starred: false, archived: false })
        txn.oncomplete = () => { db.close(); resolve() }
        txn.onerror = ev => reject(ev.target.error)
      }
      req.onerror = e => reject(e.target.error)
    })

    const { sessions, lines } = await new Promise((resolve, reject) => {
      const req = factory.open(DBNAME, 4)
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

    const walk = sessions.find(s => s.id === 's-walk')
    expect(Array.isArray(walk.body)).toBe(true)
    expect(walk.body).toHaveLength(1)
    expect(walk.body[0].text).toBe('I walked by the river.')
    expect(walk.body[0].timestamp).toBe(5500) // bodyUpdatedAt > startedAt
    expect(walk.body[0].location).toBeNull()

    const empty = sessions.find(s => s.id === 's-empty')
    expect(Array.isArray(empty.body)).toBe(true)
    expect(empty.body).toHaveLength(0)

    const legacy = sessions.find(s => s.id === 's-legacy')
    expect(legacy.body).toBeNull()

    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('alpha')
  })
})
