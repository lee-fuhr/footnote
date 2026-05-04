import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { openDB, closeDB } from '../src/db/index.js'
import { requestFolder, _resetHandle } from '../src/export/icloud.js'
import { startLiveSync, stopLiveSync, fireSync, _resetForTesting } from '../src/session/livesync.js'
import { MockDirectoryHandle, mockPicker } from './mocks/fileSystemAccess.js'

const SESSION = {
  id: 'live-1',
  startedAt: new Date('2026-05-02T08:30:00').getTime(),
  endedAt: null,
  body: [
    { text: 'Mid-walk thought one. ', timestamp: new Date('2026-05-02T08:30:30').getTime(), location: null },
  ],
}

const wait = ms => new Promise(r => setTimeout(r, ms))

beforeEach(async () => {
  await openDB(new IDBFactory())
  _resetHandle()
  _resetForTesting()
})

afterEach(() => {
  stopLiveSync()
  closeDB()
  _resetHandle()
  _resetForTesting()
  delete globalThis.showDirectoryPicker
})

describe('fireSync', () => {
  it('returns no-folder when handle missing', async () => {
    const result = await fireSync(() => SESSION)
    expect(result).toEqual({ saved: false, reason: 'no-folder' })
  })

  it('returns no-session when getter returns null', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    const result = await fireSync(() => null)
    expect(result).toEqual({ saved: false, reason: 'no-session' })
  })

  it('writes the in-progress session to walk-{startedAt}.md', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    const result = await fireSync(() => SESSION)
    expect(result.saved).toBe(true)
    expect(result.filename).toBe('walk-2026-05-02-08-30.md')
    expect(handle.files['walk-2026-05-02-08-30.md']).toContain('Mid-walk thought one.')
  })

  it('overwrites the same file on repeat call (idempotent filename)', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    await fireSync(() => SESSION)
    const updated = {
      ...SESSION,
      body: [
        ...SESSION.body,
        { text: 'New thought added during walk.', timestamp: Date.now(), location: null },
      ],
    }
    await fireSync(() => updated)
    expect(handle.files['walk-2026-05-02-08-30.md']).toContain('New thought added during walk.')
    expect(Object.keys(handle.files).filter(f => f.startsWith('walk-2026-05-02'))).toHaveLength(1)
  })
})

describe('startLiveSync', () => {
  it('fires once immediately and again on interval', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    let calls = 0
    const getSession = () => ({
      ...SESSION,
      body: [{ text: `tick ${++calls}`, timestamp: SESSION.startedAt, location: null }],
    })
    startLiveSync(getSession, 50)
    await wait(180)
    stopLiveSync()
    expect(calls).toBeGreaterThanOrEqual(3)
    expect(handle.files['walk-2026-05-02-08-30.md']).toContain(`tick ${calls}`)
  })

  it('stopLiveSync prevents further ticks', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    let calls = 0
    startLiveSync(() => { calls++; return SESSION }, 50)
    await wait(60)
    const beforeStop = calls
    stopLiveSync()
    await wait(150)
    expect(calls).toBe(beforeStop)
  })

  it('replaces the prior timer when called twice', async () => {
    const handle = new MockDirectoryHandle()
    globalThis.showDirectoryPicker = mockPicker(handle)
    await requestFolder()
    let firstCalls = 0
    let secondCalls = 0
    startLiveSync(() => { firstCalls++; return SESSION }, 50)
    await wait(60)
    startLiveSync(() => { secondCalls++; return SESSION }, 50)
    await wait(120)
    stopLiveSync()
    const firstAfter = firstCalls
    await wait(80)
    expect(firstCalls).toBe(firstAfter)
    expect(secondCalls).toBeGreaterThanOrEqual(2)
  })
})
