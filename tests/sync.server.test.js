import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the AI-analysis gate so we control whether sync is allowed.
vi.mock('../src/sync/aiSyncGate.js', () => ({
  aiAnalysisEnabled: vi.fn(),
}))

import { syncWalkToServer, startServerSync, stopServerSync, _resetForTesting } from '../src/sync/server.js'
import { aiAnalysisEnabled } from '../src/sync/aiSyncGate.js'

const SAMPLE_SESSION = {
  id: 'test-session-123',
  startedAt: 1746360000000,
  endedAt: 1746361800000,
  body: [{ timestamp: 1746360000000, text: 'Thinking about save indicators.' }],
  locationAnchors: [],
}

const wait = ms => new Promise(r => setTimeout(r, ms))

beforeEach(() => {
  _resetForTesting()
  // Default for the existing suite: AI analysis is ON, so sync behaves as before.
  aiAnalysisEnabled.mockResolvedValue(true)
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  stopServerSync()
  vi.restoreAllMocks()
})

describe('syncWalkToServer', () => {
  it('POSTs to /api/walks/sync with id, content, startedAt', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const result = await syncWalkToServer(SAMPLE_SESSION)

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledOnce()
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/api/walks/sync')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.id).toBe(SAMPLE_SESSION.id)
    expect(typeof body.content).toBe('string')
    expect(body.content.length).toBeGreaterThan(0)
    expect(body.startedAt).toBe(SAMPLE_SESSION.startedAt)
  })

  it('includes endedAt when present', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await syncWalkToServer(SAMPLE_SESSION)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.endedAt).toBe(SAMPLE_SESSION.endedAt)
  })

  it('sends endedAt null for in-progress sessions', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    const ongoing = { ...SAMPLE_SESSION, endedAt: undefined }
    await syncWalkToServer(ongoing)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.endedAt).toBeNull()
  })

  it('returns ok:false and does not throw on network error', async () => {
    fetch.mockRejectedValueOnce(new Error('network down'))
    const result = await syncWalkToServer(SAMPLE_SESSION)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('network_error')
  })

  it('returns ok:false on non-200 response', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const result = await syncWalkToServer(SAMPLE_SESSION)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('http_500')
  })

  it('returns ok:false with no throw when session is null', async () => {
    const result = await syncWalkToServer(null)
    expect(result.ok).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('startServerSync / stopServerSync', () => {
  it('fires immediately on start', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const getter = vi.fn().mockResolvedValue(SAMPLE_SESSION)

    startServerSync(getter, 50)
    await wait(30)
    stopServerSync()

    expect(getter).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('fires again after interval', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const getter = vi.fn().mockResolvedValue(SAMPLE_SESSION)

    startServerSync(getter, 50)
    await wait(130)
    stopServerSync()

    expect(getter.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('stopServerSync prevents further ticks', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const getter = vi.fn().mockResolvedValue(SAMPLE_SESSION)

    startServerSync(getter, 50)
    await wait(30)
    stopServerSync()
    const countAtStop = getter.mock.calls.length
    await wait(120)

    expect(getter.mock.calls.length).toBe(countAtStop)
  })

  it('does not double-fire if already in-flight', async () => {
    let resolve
    fetch.mockImplementation(() => new Promise(r => { resolve = r }))
    const getter = vi.fn().mockResolvedValue(SAMPLE_SESSION)

    startServerSync(getter, 50)
    await wait(130)  // two ticks elapse while first is still in-flight
    stopServerSync()

    expect(fetch).toHaveBeenCalledOnce()
    resolve({ ok: true, json: async () => ({}) })
  })
})

describe('AI-analysis gate (Free/Pro stay fully local)', () => {
  it('a user without AI analysis enabled triggers ZERO network POSTs', async () => {
    aiAnalysisEnabled.mockResolvedValue(false)
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

    const result = await syncWalkToServer(SAMPLE_SESSION)

    expect(fetch).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('ai-analysis-disabled')
  })

  it('an AI-analysis-enabled user still syncs', async () => {
    aiAnalysisEnabled.mockResolvedValue(true)
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const result = await syncWalkToServer(SAMPLE_SESSION)

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('/api/walks/sync')
    expect(result.ok).toBe(true)
  })

  it('the 60s timer makes no POSTs when AI analysis is off', async () => {
    aiAnalysisEnabled.mockResolvedValue(false)
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const getter = vi.fn().mockResolvedValue(SAMPLE_SESSION)

    startServerSync(getter, 50)
    await wait(130)
    stopServerSync()

    expect(fetch).not.toHaveBeenCalled()
  })
})
