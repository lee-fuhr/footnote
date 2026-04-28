export const DB_NAME = 'footnote-db'
export const DB_VERSION = 3

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
}
