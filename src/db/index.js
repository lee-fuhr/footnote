import { DB_NAME, DB_VERSION, upgradeDB } from './schema.js'
import { crypto } from '../utils/uuid.js'

let _db = null
let _idbFactory = null

/** Opens the database. Pass a custom IDBFactory for testing (fake-indexeddb). */
export async function openDB(idbFactory = indexedDB) {
  _idbFactory = idbFactory
  return new Promise((resolve, reject) => {
    const req = idbFactory.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => upgradeDB(e.target.result, e.oldVersion, e)
    req.onsuccess = e => { _db = e.target.result; resolve(_db) }
    req.onerror = e => reject(e.target.error)
  })
}

export function closeDB() {
  if (_db) { _db.close(); _db = null }
}

function db() {
  if (!_db) throw new Error('DB not open — call openDB() first')
  return _db
}

function uuid() {
  return crypto.randomUUID()
}

let _lastTs = 0
function monotonicNow() {
  const now = Date.now()
  _lastTs = now > _lastTs ? now : _lastTs + 1
  return _lastTs
}

function tx(stores, mode = 'readonly') {
  return db().transaction(stores, mode)
}

function put(store, value, txn) {
  return new Promise((resolve, reject) => {
    const req = txn.objectStore(store).put(value)
    req.onsuccess = () => resolve(value)
    req.onerror = e => reject(e.target.error)
  })
}

function get(store, key, txn) {
  return new Promise((resolve, reject) => {
    const req = txn.objectStore(store).get(key)
    req.onsuccess = e => resolve(e.target.result ?? null)
    req.onerror = e => reject(e.target.error)
  })
}

function getAll(store, indexName, query, txn) {
  return new Promise((resolve, reject) => {
    const source = indexName
      ? txn.objectStore(store).index(indexName)
      : txn.objectStore(store)
    const req = query ? source.getAll(query) : source.getAll()
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

function awaitTx(txn) {
  return new Promise((resolve, reject) => {
    txn.oncomplete = resolve
    txn.onerror = e => reject(e.target.error)
    txn.onabort = e => reject(e.target.error)
  })
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function openSession() {
  const session = {
    id: uuid(),
    startedAt: Date.now(),
    endedAt: null,
    title: null,
    lineCount: 0,
    approximateLocation: null,
    body: null,
    bodyUpdatedAt: null,
  }
  const txn = tx(['sessions', 'metadata'], 'readwrite')
  await Promise.all([
    put('sessions', session, txn),
    put('metadata', { key: 'last_active_session_id', value: session.id }, txn),
  ])
  await awaitTx(txn)
  return session
}

export async function closeSession(sessionId) {
  const txn = tx(['sessions', 'metadata'], 'readwrite')
  const session = await get('sessions', sessionId, txn)
  if (!session) return
  session.endedAt = Date.now()
  await Promise.all([
    put('sessions', session, txn),
    put('metadata', { key: 'last_active_session_id', value: null }, txn),
  ])
  await awaitTx(txn)
}

export async function getAllSessions() {
  const txn = tx(['sessions'], 'readonly')
  const sessions = await getAll('sessions', null, null, txn)
  return sessions.sort((a, b) => b.startedAt - a.startedAt)
}

export async function getLastActiveSessionId() {
  const txn = tx(['metadata'], 'readonly')
  const record = await get('metadata', 'last_active_session_id', txn)
  return record?.value ?? null
}

// ── Lines ────────────────────────────────────────────────────────────────────

export async function appendLine(sessionId, text, location, locationStatus) {
  const line = {
    id: uuid(),
    sessionId,
    createdAt: monotonicNow(),
    text,
    location: location ?? null,
    locationStatus: locationStatus ?? 'unavailable',
    audioBlob: null,
  }
  const txn = tx(['lines', 'sessions'], 'readwrite')
  const session = await get('sessions', sessionId, txn)
  if (session) {
    session.lineCount = (session.lineCount || 0) + 1
    await put('sessions', session, txn)
  }
  await put('lines', line, txn)
  await awaitTx(txn)
  return line
}

export async function deleteSession(sessionId) {
  const txn = tx(['sessions', 'lines', 'metadata'], 'readwrite')
  const sessionLines = await getAll('lines', 'sessionId', sessionId, txn)
  const deleteLine = line => new Promise((resolve, reject) => {
    const req = txn.objectStore('lines').delete(line.id)
    req.onsuccess = resolve
    req.onerror = e => reject(e.target.error)
  })
  const deleteSessionRecord = () => new Promise((resolve, reject) => {
    const req = txn.objectStore('sessions').delete(sessionId)
    req.onsuccess = resolve
    req.onerror = e => reject(e.target.error)
  })
  const meta = await get('metadata', 'last_active_session_id', txn)
  const clearActive = meta?.value === sessionId
    ? put('metadata', { key: 'last_active_session_id', value: null }, txn)
    : Promise.resolve()
  await Promise.all([
    ...sessionLines.map(deleteLine),
    deleteSessionRecord(),
    clearActive,
  ])
  await awaitTx(txn)
}

export async function getSessionLines(sessionId) {
  const txn = tx(['lines'], 'readonly')
  const lines = await getAll('lines', 'sessionId', sessionId, txn)
  return lines.sort((a, b) => a.createdAt - b.createdAt)
}

export async function starLine(id) {
  const txn = tx(['lines'], 'readwrite')
  const line = await get('lines', id, txn)
  if (!line) return
  await put('lines', { ...line, starred: true }, txn)
  await awaitTx(txn)
}

export async function unstarLine(id) {
  const txn = tx(['lines'], 'readwrite')
  const line = await get('lines', id, txn)
  if (!line) return
  await put('lines', { ...line, starred: false }, txn)
  await awaitTx(txn)
}

export async function getStarredLines(sessionId) {
  const txn = tx(['lines'], 'readonly')
  const lines = await getAll('lines', 'sessionId', sessionId, txn)
  return lines.filter(l => l.starred === true).sort((a, b) => a.createdAt - b.createdAt)
}

// ── Body (flat-doc, v3) ──────────────────────────────────────────────────────

// Module-level debounce timer shared with keyboard input handler.
// flushBody() cancels this timer before issuing an immediate write.
let _bodyDebounceTimer = null

/**
 * Full replace of sessions.body with fullText and updates bodyUpdatedAt.
 * Silent no-op if the session does not exist (handles in-flight debounce timers
 * that fire after a session has already been deleted — matches the pattern used
 * by closeSession and appendLine).
 */
export async function appendToBody(sessionId, fullText) {
  const txn = tx(['sessions'], 'readwrite')
  const session = await get('sessions', sessionId, txn)
  if (!session) return
  session.body = fullText
  session.bodyUpdatedAt = Date.now()
  await put('sessions', session, txn)
  await awaitTx(txn)
}

/**
 * Lets external callers (e.g. Editor.js) register the active debounce timer id
 * so that flushBody() can cancel it even when it was scheduled outside this module.
 */
export function setBodyTimer(id) {
  _bodyDebounceTimer = id
}

/**
 * Cancels any pending debounce timer and issues an immediate IDB write.
 * Returns a Promise that resolves ONLY after the IDB write commits.
 * Callers must await this before calling closeSession() to prevent last-words
 * data loss.
 */
export async function flushBody(sessionId, currentValue) {
  if (_bodyDebounceTimer !== null) {
    clearTimeout(_bodyDebounceTimer)
    _bodyDebounceTimer = null
  }
  await appendToBody(sessionId, currentValue)
}
