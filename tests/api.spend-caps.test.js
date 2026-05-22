import { describe, it, expect } from 'vitest'
import {
  CAPS,
  checkPersonCap,
  checkGlobalCap,
  deviceKey,
} from '../api/_spend-caps.js'

describe('checkPersonCap', () => {
  it('allows a person under both request and spend caps', () => {
    const r = checkPersonCap({ requests: 0, spentCents: 0 })
    expect(r.capped).toBe(false)
  })

  it('caps a person who hit the per-person request cap', () => {
    const r = checkPersonCap({ requests: CAPS.PERSON_MAX_REQUESTS_PER_DAY, spentCents: 0 })
    expect(r.capped).toBe(true)
    expect(r.reason).toBe('person_request_cap')
  })

  it('caps a person who hit the per-person spend cap', () => {
    const r = checkPersonCap({ requests: 1, spentCents: CAPS.PERSON_MAX_CENTS_PER_DAY })
    expect(r.capped).toBe(true)
    expect(r.reason).toBe('person_spend_cap')
  })

  it('does not cap one request below the request cap', () => {
    const r = checkPersonCap({ requests: CAPS.PERSON_MAX_REQUESTS_PER_DAY - 1, spentCents: 0 })
    expect(r.capped).toBe(false)
  })

  it('treats missing counters as zero', () => {
    const r = checkPersonCap({})
    expect(r.capped).toBe(false)
  })
})

describe('checkGlobalCap', () => {
  it('allows when global spend is under cap', () => {
    const r = checkGlobalCap({ spentCents: 0, requests: 0 })
    expect(r.capped).toBe(false)
  })

  it('caps when global spend cap is reached', () => {
    const r = checkGlobalCap({ spentCents: CAPS.GLOBAL_MAX_CENTS_PER_DAY, requests: 0 })
    expect(r.capped).toBe(true)
    expect(r.reason).toBe('global_spend_cap')
  })

  it('caps when global request cap is reached', () => {
    const r = checkGlobalCap({ spentCents: 0, requests: CAPS.GLOBAL_MAX_REQUESTS_PER_DAY })
    expect(r.capped).toBe(true)
    expect(r.reason).toBe('global_request_cap')
  })

  it('does not cap one cent below the spend cap', () => {
    const r = checkGlobalCap({ spentCents: CAPS.GLOBAL_MAX_CENTS_PER_DAY - 1, requests: 0 })
    expect(r.capped).toBe(false)
  })
})

describe('deviceKey', () => {
  it('derives a stable key from a device id', () => {
    expect(deviceKey('abc-123')).toBe('abc-123')
  })

  it('falls back to "anon" for empty / missing ids', () => {
    expect(deviceKey('')).toBe('anon')
    expect(deviceKey(undefined)).toBe('anon')
    expect(deviceKey(null)).toBe('anon')
  })

  it('sanitizes ids to a safe redis key segment', () => {
    expect(deviceKey('a/b:c d')).toBe('a-b-c-d')
  })

  it('truncates very long ids', () => {
    const key = deviceKey('x'.repeat(200))
    expect(key.length).toBeLessThanOrEqual(64)
  })
})

describe('CAPS config', () => {
  it('exposes tunable named constants', () => {
    expect(typeof CAPS.PERSON_MAX_REQUESTS_PER_DAY).toBe('number')
    expect(typeof CAPS.PERSON_MAX_CENTS_PER_DAY).toBe('number')
    expect(typeof CAPS.GLOBAL_MAX_REQUESTS_PER_DAY).toBe('number')
    expect(typeof CAPS.GLOBAL_MAX_CENTS_PER_DAY).toBe('number')
  })

  it('global caps are larger than per-person caps', () => {
    expect(CAPS.GLOBAL_MAX_CENTS_PER_DAY).toBeGreaterThan(CAPS.PERSON_MAX_CENTS_PER_DAY)
    expect(CAPS.GLOBAL_MAX_REQUESTS_PER_DAY).toBeGreaterThan(CAPS.PERSON_MAX_REQUESTS_PER_DAY)
  })
})
