export const DB_NAME = 'footnote-db'
export const DB_VERSION = 4

export function upgradeDB(db, oldVersion, e) {
  if (oldVersion < 1) {
    const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
    sessions.createIndex('startedAt', 'startedAt')
    sessions.createIndex('endedAt', 'endedAt')

    const lines = db.createObjectStore('lines', { keyPath: 'id' })
    lines.createIndex('sessionId', 'sessionId')
    lines.createIndex('createdAt', 'createdAt')

    db.createObjectStore('metadata', { keyPath: 'key' })
  }

  if (oldVersion < 2) {
    const store = e.target.transaction.objectStore('lines')
    const req = store.openCursor()
    req.onsuccess = ev => {
      const cursor = ev.target.result
      if (!cursor) return
      cursor.update({ ...cursor.value, starred: false, archived: false })
      cursor.continue()
    }
  }

  if (oldVersion < 3) {
    // Additive migration: add body and bodyUpdatedAt (both null) to every
    // existing session. Lines store is not touched.
    const store = e.target.transaction.objectStore('sessions')
    const req = store.openCursor()
    req.onsuccess = ev => {
      const cursor = ev.target.result
      if (!cursor) return
      cursor.update({ ...cursor.value, body: null, bodyUpdatedAt: null })
      cursor.continue()
    }
  }

  if (oldVersion < 4) {
    // body type changes from string to array of chunks. Empty string becomes
    // an empty array; non-empty string is wrapped as a single chunk anchored
    // to the session start (no GPS — we never captured it for v3 walks).
    // null bodies (legacy line-based sessions) are left alone.
    const store = e.target.transaction.objectStore('sessions')
    const req = store.openCursor()
    req.onsuccess = ev => {
      const cursor = ev.target.result
      if (!cursor) return
      const val = cursor.value
      if (typeof val.body === 'string') {
        // Anchor the migrated chunk to the most recent edit if available;
        // bodyUpdatedAt is closer to when the user actually wrote than the
        // session's start time. Falls back to startedAt for very old rows
        // missing bodyUpdatedAt.
        const body = val.body === ''
          ? []
          : [{ text: val.body, timestamp: val.bodyUpdatedAt ?? val.startedAt, location: null }]
        cursor.update({ ...val, body })
      }
      cursor.continue()
    }
  }
}
