/**
 * THE privacy test (permanent).
 *
 * Proves that a Free/Pro user's JOURNAL CONTENT never leaves the device while
 * AI analysis is OFF. This is content-based, not "zero POSTs": we spy the real
 * network boundary (global fetch + navigator.sendBeacon), capture every request
 * body, and assert that a distinctive sentinel walk text and a sentinel GPS
 * coordinate appear in NO outbound body.
 *
 * The gate under test is the REAL one (src/sync/aiSyncGate.js + src/sync/server.js).
 * We only stub the gate's two real inputs — AI Pack access (tier.js) and the
 * stored consent flag (db getMeta) — so the actual gate logic is exercised, not
 * a mock of it.
 *
 * Three guards make this hard to fool:
 *   1. Content assertion — sentinel text/GPS must not appear in any body.
 *   2. Allow-list assertion — any egress while AI is off may only target known
 *      non-content endpoints (/api/vote, /api/waitlist). A future feature that
 *      silently POSTs walk content somewhere new fails here.
 *   3. Positive control — with AI analysis ON, the sentinel DOES appear in the
 *      /api/walks/sync body. If this fails, the spy is broken and the OFF
 *      assertions are worthless.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Stub only the gate's real inputs. aiSyncGate + server are the real modules.
vi.mock('../src/db/index.js', async () => {
  const actual = await vi.importActual('../src/db/index.js')
  return { ...actual, getMeta: vi.fn() }
})
vi.mock('../src/tier.js', async () => {
  const actual = await vi.importActual('../src/tier.js')
  return { ...actual, hasAiPackAccess: vi.fn() }
})

import {
  syncWalkToServer,
  startServerSync,
  stopServerSync,
  _resetForTesting,
} from '../src/sync/server.js'
import { getMeta } from '../src/db/index.js'
import { hasAiPackAccess } from '../src/tier.js'

// --- sentinels -------------------------------------------------------------
const SENTINEL_TEXT = 'SENTINEL_PRIVATE_JOURNAL_TEXT_12345'
const SENTINEL_LAT = 41.40338            // renders as "41.403" in markdown headers
const SENTINEL_LNG = -73.98765
const SENTINEL_GPS = '41.40338,-73.98765' // embedded raw in the walk text too

// A walk whose content is unmistakable if it ever leaves the device.
const SENTINEL_SESSION = {
  id: 'sentinel-walk-1',
  startedAt: 1746360000000,
  endedAt: 1746361800000,
  body: [
    {
      timestamp: 1746360000000,
      text: `${SENTINEL_TEXT} at ${SENTINEL_GPS}`,
      location: { lat: SENTINEL_LAT, lng: SENTINEL_LNG, accuracy: 5 },
    },
  ],
  locationAnchors: [{ timestamp: 1746360000000, lat: SENTINEL_LAT, lng: SENTINEL_LNG, accuracy: 5 }],
}

// Endpoints allowed to receive ANY outbound request while AI analysis is off.
// These never carry journal content (votes are device-id + featureId; waitlist
// is an email address the user typed). Walk content must NOT appear here either,
// but the allow-list specifically catches a NEW egress destination appearing.
const ALLOWED_OFF_PREFIXES = ['/api/vote', '/api/waitlist']

const wait = ms => new Promise(r => setTimeout(r, ms))

// Capture every outbound request at the boundary.
let captured
function installSpies() {
  captured = []
  const record = (url, body) => captured.push({ url: String(url), body: body == null ? '' : String(body) })

  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    record(url, opts.body)
    return { ok: true, status: 200, json: async () => ({ ok: true }) }
  }))

  // sendBeacon may not exist in node; install a spy regardless so a future use
  // of it is also captured.
  const beacon = vi.fn((url, body) => { record(url, body); return true })
  if (typeof navigator === 'undefined') {
    vi.stubGlobal('navigator', { sendBeacon: beacon })
  } else {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon })
  }
}

function bodyContainsSentinel(body) {
  return (
    body.includes(SENTINEL_TEXT) ||
    body.includes(SENTINEL_GPS) ||
    body.includes('41.403') ||           // markdown-rendered lat
    body.includes(String(SENTINEL_LAT)) ||
    body.includes(String(SENTINEL_LNG))
  )
}

beforeEach(() => {
  _resetForTesting()
  installSpies()
})

afterEach(() => {
  stopServerSync()
  vi.restoreAllMocks()
})

describe('PRIVACY: journal content never leaves the device with AI analysis OFF', () => {
  beforeEach(() => {
    // AI analysis OFF — Pro user, no consent given.
    hasAiPackAccess.mockReturnValue(true)
    getMeta.mockResolvedValue(false)
  })

  it('drives every sync trigger and leaks the sentinel through none of them', async () => {
    // 1) Session-end authoritative sync
    await syncWalkToServer(SENTINEL_SESSION)

    // 2) The in-progress interval tick (the "60s" timer, sped up for the test)
    startServerSync(async () => SENTINEL_SESSION, 20)
    await wait(70)
    stopServerSync()

    // 3) visibilitychange -> hidden (server.js registers its own listener)
    if (typeof document !== 'undefined') {
      startServerSync(async () => SENTINEL_SESSION, 100000) // long interval; we want the vis tick, not the timer
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      await wait(30)
      stopServerSync()
    }

    // Content assertion: no captured body may contain the sentinel.
    const leaks = captured.filter(c => bodyContainsSentinel(c.body))
    expect(leaks).toEqual([])

    // Allow-list assertion: any egress at all must target a known non-content
    // endpoint. (We expect zero here, but this catches a future silent egress.)
    const offList = captured.filter(
      c => !ALLOWED_OFF_PREFIXES.some(p => c.url.startsWith(p)),
    )
    expect(offList).toEqual([])
  })
})

describe('PRIVACY positive control: the spy can actually detect a leak', () => {
  it('with AI analysis ON, the sentinel DOES appear in the /api/walks/sync body', async () => {
    // AI analysis ON — Pro user who turned analysis on (consent given).
    hasAiPackAccess.mockReturnValue(true)
    getMeta.mockResolvedValue(true)

    const result = await syncWalkToServer(SENTINEL_SESSION)

    expect(result.ok).toBe(true)
    const sync = captured.find(c => c.url === '/api/walks/sync')
    expect(sync).toBeTruthy()
    // The whole point: the sentinel content is in the outbound body when, and
    // only when, the user opted into AI analysis.
    expect(bodyContainsSentinel(sync.body)).toBe(true)
    expect(sync.body).toContain(SENTINEL_TEXT)
  })
})
