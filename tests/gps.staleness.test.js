import { describe, it, expect } from 'vitest'
import { getLocationStatus, STALE_MS } from '../src/gps/staleness.js'

describe('GPS staleness', () => {
  it('exports STALE_MS = 60 seconds', () => {
    expect(STALE_MS).toBe(60 * 1000)
  })

  it('null capturedAt → unavailable', () => {
    expect(getLocationStatus(null)).toBe('unavailable')
  })

  it('59s ago → live', () => {
    expect(getLocationStatus(Date.now() - 59000)).toBe('live')
  })

  it('exactly 60s ago → stale', () => {
    expect(getLocationStatus(Date.now() - 60000)).toBe('stale')
  })

  it('61s ago → stale', () => {
    expect(getLocationStatus(Date.now() - 61000)).toBe('stale')
  })

  it('just now → live', () => {
    expect(getLocationStatus(Date.now())).toBe('live')
  })

  it('5 minutes ago → stale', () => {
    expect(getLocationStatus(Date.now() - 5 * 60 * 1000)).toBe('stale')
  })
})
