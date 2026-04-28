const KEY = 'footnote_starred_sessions'

function _read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function isSessionStarred(sessionId) {
  return _read().includes(sessionId)
}

export function markSessionStarred(sessionId) {
  try {
    const ids = _read()
    if (!ids.includes(sessionId)) {
      ids.push(sessionId)
      localStorage.setItem(KEY, JSON.stringify(ids))
    }
  } catch {}
}
