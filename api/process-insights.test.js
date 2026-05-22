/**
 * Spend-cap enforcement for the AI Insights endpoint.
 * Verifies the handler blocks gracefully when a per-person or global cap is hit,
 * and otherwise proceeds. Redis (Upstash REST) and Anthropic are both reached via
 * global fetch, so we mock fetch and route by URL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from './process-insights.js'
import { CAPS } from './_spend-caps.js'

const KEY = 'test-insights-key'
const today = new Date().toISOString().slice(0, 10)

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    end() { return this },
  }
}

function makeReq(overrides = {}) {
  const walkIds = ['w1', 'w2', 'w3']
  const walkBodies = [
    'Thinking about the shape of my mornings and how restless I feel before coffee.',
    'More on restlessness, and a thread about wanting to leave my job behind.',
    'The job thread again, plus a worry about money that keeps surfacing on walks.',
  ]
  return {
    method: 'POST',
    headers: { 'x-insights-key': KEY, 'x-device-id': 'device-alpha', ...overrides.headers },
    body: { walkIds, walkBodies, ...overrides.body },
  }
}

// Counters the fake Redis returns, keyed by the suffix of the GET path.
let kvState

function routeFetch(url, opts) {
  const u = String(url)
  if (u.includes('api.anthropic.com')) {
    // Two calls: Haiku clustering, then Sonnet exec summaries.
    const isSonnet = JSON.parse(opts.body).model.includes('sonnet')
    const payload = isSonnet
      ? { content: [{ text: JSON.stringify({ summaries: [{ id: 'restlessness', execSummary: 'A recurring pull toward change.' }] }) }], usage: { input_tokens: 100, output_tokens: 50 } }
      : { content: [{ text: JSON.stringify({ clusters: [{ id: 'restlessness', name: 'Restlessness about work', summary: 'A pull toward leaving.', walkIds: ['w1', 'w2', 'w3'] }] }) }], usage: { input_tokens: 200, output_tokens: 80 } }
    return Promise.resolve({ ok: true, json: async () => payload })
  }
  // Upstash REST: GET get/<key>  → return { result }
  const m = u.match(/\/get\/(.+)$/)
  if (m) {
    const key = decodeURIComponent(m[1])
    return Promise.resolve({ ok: true, json: async () => ({ result: kvState[key] ?? null }) })
  }
  // incrby / expire / incr — just succeed
  return Promise.resolve({ ok: true, json: async () => ({ result: 1 }) })
}

beforeEach(() => {
  kvState = {}
  process.env.FOOTNOTE_INSIGHTS_KEY = KEY
  process.env.ANTHROPIC_API_KEY = 'sk-test'
  process.env.UPSTASH_REDIS_REST_URL = 'https://kv.example'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'kv-token'
  vi.stubGlobal('fetch', vi.fn(routeFetch))
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})

describe('process-insights spend caps', () => {
  it('processes normally when all counters are under cap', async () => {
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body.clusters)).toBe(true)
  })

  it('blocks with 429 when the per-person request cap is hit', async () => {
    kvState[`insights:person:requests:${today}:device-alpha`] = String(CAPS.PERSON_MAX_REQUESTS_PER_DAY)
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(429)
    expect(res.body.reason).toBe('person_request_cap')
    // No Anthropic call should have happened.
    const calledAnthropic = fetch.mock.calls.some(c => String(c[0]).includes('anthropic.com'))
    expect(calledAnthropic).toBe(false)
  })

  it('blocks with 429 when the per-person spend cap is hit', async () => {
    kvState[`insights:person:spent:${today}:device-alpha`] = String(CAPS.PERSON_MAX_CENTS_PER_DAY)
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(429)
    expect(res.body.reason).toBe('person_spend_cap')
  })

  it('blocks with 429 when the global spend cap is hit', async () => {
    kvState[`insights:budget:${today}`] = String(CAPS.GLOBAL_MAX_CENTS_PER_DAY)
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(429)
    expect(res.body.reason).toBe('global_spend_cap')
  })

  it('blocks with 429 when the global request cap is hit', async () => {
    kvState[`insights:global:requests:${today}`] = String(CAPS.GLOBAL_MAX_REQUESTS_PER_DAY)
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(429)
    expect(res.body.reason).toBe('global_request_cap')
  })

  it('returns a clear, human message on cap hit (no crash)', async () => {
    kvState[`insights:global:requests:${today}`] = String(CAPS.GLOBAL_MAX_REQUESTS_PER_DAY)
    const res = makeRes()
    await handler(makeReq(), res)
    expect(typeof res.body.error).toBe('string')
    expect(res.body.error.length).toBeGreaterThan(0)
  })

  it('still rejects bad auth before any cap logic', async () => {
    const res = makeRes()
    await handler(makeReq({ headers: { 'x-insights-key': 'wrong' } }), res)
    expect(res.statusCode).toBe(401)
  })
})

describe('process-insights spend caps — fail closed', () => {
  it('blocks with 429 when the spend-meter store is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res.statusCode).toBe(429)
    expect(res.body.reason).toBe('spend_meter_unavailable')
    // No Anthropic call may happen when we can't enforce caps.
    const calledAnthropic = fetch.mock.calls.some(c => String(c[0]).includes('anthropic.com'))
    expect(calledAnthropic).toBe(false)
  })

  it('blocks with 429 (no AI call) when the spend-meter read throws', async () => {
    // Store is configured, but the GET to Redis fails — we must fail closed.
    fetch.mockImplementation((url, opts) => {
      if (String(url).includes('/get/')) return Promise.reject(new Error('kv down'))
      return routeFetch(url, opts)
    })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res.statusCode).toBe(429)
    expect(res.body.reason).toBe('spend_meter_unavailable')
    const calledAnthropic = fetch.mock.calls.some(c => String(c[0]).includes('anthropic.com'))
    expect(calledAnthropic).toBe(false)
  })

  it('returns a clear, human message when failing closed', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const res = makeRes()
    await handler(makeReq(), res)
    expect(typeof res.body.error).toBe('string')
    expect(res.body.error.length).toBeGreaterThan(0)
  })
})
