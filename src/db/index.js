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

// ── Metadata (generic key-value) ────────────────────────────────────────────

export async function getMeta(key) {
  const txn = tx(['metadata'], 'readonly')
  const record = await get('metadata', key, txn)
  return record?.value ?? null
}

export async function storeMeta(key, value) {
  const txn = tx(['metadata'], 'readwrite')
  await put('metadata', { key, value }, txn)
  await awaitTx(txn)
}

// ── Body (chunk array, v4) ───────────────────────────────────────────────────

// Two-minute window — pauses under this extend the last chunk; pauses at or
// over create a new chunk. Locked decision (decisions.md, Q1).
export const CHUNK_GAP_MS = 120 * 1000

/**
 * Flatten chunk array to the text the user sees in the textarea.
 * Returns '' for null/undefined/empty bodies.
 */
export function chunkBodyText(body) {
  if (Array.isArray(body)) return body.map(c => c.text).join('')
  return ''
}

let _chunkDebounceTimer = null

/**
 * Initialise a fresh walk session: body = [] (empty array of chunks).
 * Distinguishes a walk-mode session (array body) from a legacy line session
 * (null body). Silent no-op if the session does not exist.
 */
export async function initChunkBody(sessionId) {
  const txn = tx(['sessions'], 'readwrite')
  const session = await get('sessions', sessionId, txn)
  if (!session) return
  session.body = []
  session.bodyUpdatedAt = Date.now()
  await put('sessions', session, txn)
  await awaitTx(txn)
}

/**
 * Append-or-extend a chunk for sessionId given the current full textarea
 * value. Pauses under CHUNK_GAP_MS extend the last chunk; pauses ≥ that gap
 * seal it and start a new one. Silent no-op for a missing session.
 *
 * Sealed chunks are normally frozen, but if the user deletes back past a
 * seal, sealed chunks are popped from the tail until the textarea content is
 * a prefix-match again. This keeps concat(chunks.text) === fullText.
 */
export async function appendChunk(sessionId, fullText, { timestamp, location }) {
  const txn = tx(['sessions'], 'readwrite')
  const session = await get('sessions', sessionId, txn)
  if (!session) return

  let body = Array.isArray(session.body) ? [...session.body] : []

  const lastChunk = body[body.length - 1]
  const startNewChunk =
    !lastChunk || timestamp - lastChunk.timestamp >= CHUNK_GAP_MS

  // Pop sealed chunks if the user has deleted past their seal. If a new
  // chunk is starting, every existing chunk is treated as sealed; otherwise
  // only the chunks before the last one are sealed.
  const sealedSliceEnd = () => (startNewChunk ? body.length : body.length - 1)
  while (body.length > 0) {
    const sealedText = body.slice(0, sealedSliceEnd()).map(c => c.text).join('')
    if (fullText.startsWith(sealedText)) break
    // drop the most recent sealed chunk (always at position sealedSliceEnd()-1)
    const idx = sealedSliceEnd() - 1
    body = [...body.slice(0, idx), ...body.slice(idx + 1)]
  }

  const sealedText = body.slice(0, sealedSliceEnd()).map(c => c.text).join('')
  const newChunkText = fullText.startsWith(sealedText)
    ? fullText.slice(sealedText.length)
    : fullText

  if (startNewChunk) {
    body = [...body, { text: newChunkText, timestamp, location }]
  } else {
    body = [...body.slice(0, -1), { text: newChunkText, timestamp, location }]
  }

  session.body = body
  session.bodyUpdatedAt = timestamp
  await put('sessions', session, txn)
  await awaitTx(txn)
}

/**
 * Register the active debounce timer id so flushChunk() can cancel it.
 * Cancels any prior pending timer before storing the new id — without this,
 * rapid input or simultaneous keyboard + voice events would stack timers
 * and fire multiple appendChunk calls per keystroke.
 */
export function setChunkTimer(id) {
  if (_chunkDebounceTimer !== null) clearTimeout(_chunkDebounceTimer)
  _chunkDebounceTimer = id
}

// ── Location anchors ─────────────────────────────────────────────────────────

/**
 * Append a GPS anchor {lat, lng, accuracy, timestamp} to the session record.
 * Initializes locationAnchors array if the field is absent (no migration needed).
 * Silent no-op for a missing session.
 */
export async function appendLocationAnchor(sessionId, anchor) {
  const txn = tx(['sessions'], 'readwrite')
  const session = await get('sessions', sessionId, txn)
  if (!session) return
  const anchors = Array.isArray(session.locationAnchors) ? [...session.locationAnchors] : []
  anchors.push(anchor)
  session.locationAnchors = anchors
  await put('sessions', session, txn)
  await awaitTx(txn)
}

/** Returns the location anchor array for a session, or [] if none exist. */
export async function getLocationAnchors(sessionId) {
  const txn = tx(['sessions'], 'readonly')
  const session = await get('sessions', sessionId, txn)
  return Array.isArray(session?.locationAnchors) ? session.locationAnchors : []
}

/**
 * Returns the anchor nearest to `timestamp` from an array, or null if empty.
 * On tie, the earlier anchor wins (lower index).
 */
export function interpolateLocation(timestamp, anchors) {
  if (!anchors || anchors.length === 0) return null
  let nearest = anchors[0]
  let minDiff = Math.abs(timestamp - anchors[0].timestamp)
  for (let i = 1; i < anchors.length; i++) {
    const diff = Math.abs(timestamp - anchors[i].timestamp)
    if (diff < minDiff) { minDiff = diff; nearest = anchors[i] }
  }
  return nearest
}

/**
 * Cancel any pending chunk-debounce timer and issue an immediate write.
 * Resolves only after the IDB write commits — callers must await before
 * closeSession() to avoid last-words data loss.
 */
export async function flushChunk(sessionId, fullText, { timestamp, location } = {}) {
  if (_chunkDebounceTimer !== null) {
    clearTimeout(_chunkDebounceTimer)
    _chunkDebounceTimer = null
  }
  await appendChunk(sessionId, fullText, {
    timestamp: timestamp ?? Date.now(),
    location: location ?? null,
  })
}
