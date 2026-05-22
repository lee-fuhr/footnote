/**
 * Co-located guard test for server sync.
 *
 * The comprehensive transport tests live in tests/sync.server.test.js. This file
 * focuses on the AI-analysis gate: Free/Pro must stay fully local (no off-device
 * POST), while a user with AI analysis enabled still syncs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../aiSyncGate.js', () => ({
  aiAnalysisEnabled: vi.fn(),
}))

import { syncWalkToServer, startServerSync, stopServerSync, _resetForTesting } from '../server.js'
import { aiAnalysisEnabled } from '../aiSyncGate.js'

const SAMPLE_SESSION = {
  id: 'guard-session-1',
  startedAt: 1746360000000,
  endedAt: 1746361800000,
  body: [{ timestamp: 1746360000000, text: 'A walk worth keeping local.' }],
  locationAnchors: [],
}

const wait = ms => new Promise(r => setTimeout(r, ms))

beforeEach(() => {
  _resetForTesting()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  stopServerSync()
  vi.restoreAllMocks()
})

describe('server sync AI-analysis gate', () => {
  it('makes zero network POSTs when AI analysis is disabled', async () => {
    aiAnalysisEnabled.mockResolvedValue(false)
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

    const result = await syncWalkToServer(SAMPLE_SESSION)

    expect(fetch).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('ai-analysis-disabled')
  })

  it('still syncs when AI analysis is enabled', async () => {
    aiAnalysisEnabled.mockResolvedValue(true)
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const result = await syncWalkToServer(SAMPLE_SESSION)

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('/api/walks/sync')
    expect(result.ok).toBe(true)
  })

  it('the 60s timer never POSTs while AI analysis is off', async () => {
    aiAnalysisEnabled.mockResolvedValue(false)
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const getter = vi.fn().mockResolvedValue(SAMPLE_SESSION)

    startServerSync(getter, 50)
    await wait(130)
    stopServerSync()

    expect(fetch).not.toHaveBeenCalled()
  })
})
