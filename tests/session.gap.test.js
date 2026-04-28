import { describe, it, expect } from 'vitest'
import { shouldStartNewSession, GAP_MS } from '../src/session/gap.js'

const MIN = 60 * 1000

describe('session gap detection', () => {
  it('exports GAP_MS = 30 minutes', () => {
    expect(GAP_MS).toBe(30 * MIN)
  })

  it('29 minutes since last heartbeat → no new session', () => {
    const lastHeartbeat = Date.now() - 29 * MIN
    expect(shouldStartNewSession(lastHeartbeat)).toBe(false)
  })

  it('exactly 30 minutes → new session', () => {
    const lastHeartbeat = Date.now() - 30 * MIN
    expect(shouldStartNewSession(lastHeartbeat)).toBe(true)
  })

  it('31 minutes → new session', () => {
    const lastHeartbeat = Date.now() - 31 * MIN
    expect(shouldStartNewSession(lastHeartbeat)).toBe(true)
  })

  it('null heartbeat (no prior session) → no new session needed', () => {
    expect(shouldStartNewSession(null)).toBe(false)
  })

  it('0ms ago → no new session', () => {
    expect(shouldStartNewSession(Date.now())).toBe(false)
  })
})
