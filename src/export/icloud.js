import { getMeta, storeMeta } from '../db/index.js'
import { sessionToMarkdown } from './markdown.js'

// Live handle for the current session — avoids repeated IDB reads and preserves
// the FileSystemDirectoryHandle prototype across calls. IDB stores the handle
// for cross-reload persistence (browsers support structured cloning of FSA handles).
let _handle = null

/** Reset the in-memory handle — used in tests between runs. */
export function _resetHandle() { _handle = null }

export function formatFilename(session) {
  const d = new Date(session.startedAt)
  const p = n => String(n).padStart(2, '0')
  return `walk-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}.md`
}

export async function hasFolder() {
  if (_handle !== null) return true
  return (await getMeta('folderHandle')) !== null
}

export async function requestFolder() {
  try {
    const handle = await globalThis.showDirectoryPicker({ mode: 'readwrite' })
    _handle = handle
    await storeMeta('folderHandle', handle)
    return handle
  } catch {
    return null
  }
}

export async function syncMasterJournal(sessions) {
  const handle = _handle ?? await getMeta('folderHandle')
  if (!handle) return { saved: false, reason: 'no-folder' }
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm !== 'granted') {
      const req = await handle.requestPermission({ mode: 'readwrite' })
      if (req !== 'granted') return { saved: false, reason: 'permission-denied' }
    }
    const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt)
    const content = sorted.map(s => sessionToMarkdown(s, s.locationAnchors ?? [])).join('\n\n---\n\n')
    const fileHandle = await handle.getFileHandle('footnote-journal.md', { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return { saved: true }
  } catch {
    return { saved: false, reason: 'error' }
  }
}

export async function autoExport(session) {
  // Prefer in-memory handle; fall back to IDB (works in browsers across reloads)
  const handle = _handle ?? await getMeta('folderHandle')
  if (!handle) return { saved: false, reason: 'no-folder' }

  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm !== 'granted') {
      const req = await handle.requestPermission({ mode: 'readwrite' })
      if (req !== 'granted') return { saved: false, reason: 'permission-denied' }
    }
    const filename = formatFilename(session)
    const content = sessionToMarkdown(session, [])
    const fileHandle = await handle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return { saved: true, filename }
  } catch {
    return { saved: false, reason: 'error' }
  }
}
