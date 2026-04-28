const KEY = 'footnote_coda_sessions'
const LEGACY_KEY = 'footnote_stacked_sessions'

function _read() {
  try {
    // Migration: if legacy key exists and new key does not, move it.
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy !== null && localStorage.getItem(KEY) === null) {
      localStorage.setItem(KEY, legacy)
      localStorage.removeItem(LEGACY_KEY)
    }
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch { return [] }
}

export function isCoded(sessionId) {
  return _read().includes(sessionId)
}

export function markCoded(sessionId) {
  try {
    const ids = _read()
    if (!ids.includes(sessionId)) {
      ids.push(sessionId)
      localStorage.setItem(KEY, JSON.stringify(ids))
    }
  } catch {}
}
