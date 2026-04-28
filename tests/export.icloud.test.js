import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { openDB, closeDB } from '../src/db/index.js'
import { formatFilename, hasFolder, requestFolder, autoExport, _resetHandle } from '../src/export/icloud.js'
import { MockDirectoryHandle, mockPicker, mockPickerCancelled } from './mocks/fileSystemAccess.js'

const SESSION = {
  id: 'test-session',
  startedAt: new Date('2026-04-28T14:35:00').getTime(),
  endedAt: new Date('2026-04-28T15:10:00').getTime(),
  body: 'Walked through the park. Thought about the project.',
}

beforeEach(async () => {
  await openDB(new IDBFactory())
  _resetHandle()
})

afterEach(() => {
  closeDB()
  _resetHandle()
  delete globalThis.showDirectoryPicker
})

describe('formatFilename', () => {
  it('returns walk-YYYY-MM-DD-HH-MM.md from startedAt', () => {
    expect(formatFilename(SESSION)).toBe('walk-2026-04-28-14-35.md')
  })

  it('zero-pads month, day, hour, minute', () => {
    const s = { startedAt: new Date('2026-01-05T08:04:00').getTime() }
    expect(formatFilename(s)).toBe('walk-2026-01-05-08-04.md')
  })
})

describe('hasFolder', () => {
  it('returns false when no handle stored', async () => {
    expect(await hasFolder()).toBe(false)
  })

  it('returns true after requestFolder succeeds', async () => {
    globalThis.showDirectoryPicker = mockPicker(new MockDirectoryHandle())
    await requestFolder()
    expect(await hasFolder()).toBe(true)
  })
})

describe('requestFolder', () => {
  it('stores handle in memory and returns it', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    const result = await requestFolder()
    expect(result).toBe(handle)
    expect(await hasFolder()).toBe(true)
  })

  it('returns null when user cancels (AbortError)', async () => {
    globalThis.showDirectoryPicker = mockPickerCancelled()
    const result = await requestFolder()
    expect(result).toBeNull()
    expect(await hasFolder()).toBe(false)
  })
})

describe('autoExport', () => {
  it('returns no-folder when no handle stored', async () => {
    const result = await autoExport(SESSION)
    expect(result).toEqual({ saved: false, reason: 'no-folder' })
  })

  it('writes file with correct filename', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    const result = await autoExport(SESSION)
    expect(result.saved).toBe(true)
    expect(result.filename).toBe('walk-2026-04-28-14-35.md')
    expect(handle.files['walk-2026-04-28-14-35.md']).toBeDefined()
  })

  it('file content includes the walk body', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    await autoExport(SESSION)
    expect(handle.files['walk-2026-04-28-14-35.md']).toContain('Walked through the park.')
  })

  it('returns permission-denied when handle permission revoked', async () => {
    const handle = new MockDirectoryHandle({ permissionGranted: false })
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    const result = await autoExport(SESSION)
    expect(result).toEqual({ saved: false, reason: 'permission-denied' })
  })
})
