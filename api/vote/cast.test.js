/**
 * Device-bound vote cast endpoint.
 *
 * Lee's locked decision: voting is one-vote-per-device, no account, no OTP, no
 * token verification. The caller sends a stable device id; the server dedupes
 * people by that id (Redis SADD), so a device that votes twice still counts as
 * one person. There is no auth path left to verify.
 *
 * Redis (Upstash REST) is reached via global fetch; we mock it and route by URL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from './cast.js'

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    end() { return this },
  }
}

let calls
beforeEach(() => {
  calls = []
  process.env.UPSTASH_REDIS_REST_URL = 'https://kv.example'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'kv-token'
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    calls.push(String(url))
    // Throttle GET returns "not throttled"
    if (String(url).includes('/get/votes:throttle:')) {
      return { ok: true, json: async () => ({ result: null }) }
    }
    return { ok: true, json: async () => ({ result: 1 }) }
  }))
})

afterEach(() => { vi.restoreAllMocks() })

describe('vote cast — device-bound', () => {
  it('rejects non-POST', async () => {
    const res = makeRes()
    await handler({ method: 'GET', body: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('requires featureId and a device id', async () => {
    const res = makeRes()
    await handler({ method: 'POST', headers: {}, body: { featureId: 'echo' } }, res)
    expect(res.statusCode).toBe(400)
  })

  it('records the vote keyed by device id (people set deduped server-side)', async () => {
    const res = makeRes()
    await handler(
      { method: 'POST', headers: {}, body: { featureId: 'echo', deviceId: 'dev-123' } },
      res,
    )
    expect(res.body).toEqual({ ok: true })
    // The people SADD must key on the device id so one device = one person.
    expect(calls.some(u => u.includes('/sadd/votes:people:echo/dev-123'))).toBe(true)
  })

  it('accepts the device id from the x-device-id header too', async () => {
    const res = makeRes()
    await handler(
      { method: 'POST', headers: { 'x-device-id': 'hdr-dev' }, body: { featureId: 'pulse' } },
      res,
    )
    expect(res.body).toEqual({ ok: true })
    expect(calls.some(u => u.includes('/sadd/votes:people:pulse/hdr-dev'))).toBe(true)
  })

  it('never verifies an auth token (no token: lookup)', async () => {
    const res = makeRes()
    await handler(
      { method: 'POST', headers: {}, body: { featureId: 'echo', deviceId: 'dev-9', token: 'whatever' } },
      res,
    )
    expect(calls.some(u => u.includes('/get/token:'))).toBe(false)
  })
})
