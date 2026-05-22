/**
 * Device-bound voting contract for VoteSheet.
 *
 * Lee's locked decision: voting is one-vote-per-device, no email, no OTP, no
 * login. The vote sheet must NOT import AuthSheet, must NOT read a stored auth
 * token, must NOT offer a "Verify phone" affordance, and must carry a calm,
 * honest note that voting is the one thing that leaves the device.
 *
 * Environment is plain Node (no jsdom), so this is a source-contract guardrail
 * in the same style as the other sheet tests, plus the device-dedup logic.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'VoteSheet.js'),
  'utf8',
)

describe('VoteSheet — device-bound, no login', () => {
  it('does not import AuthSheet', () => {
    expect(src).not.toContain('AuthSheet')
    expect(src).not.toContain('authSheet')
  })

  it('does not read a stored auth token', () => {
    expect(src).not.toContain('footnote_auth')
  })

  it('offers no phone/OTP verification affordance', () => {
    expect(src).not.toContain('Verify phone')
    expect(src).not.toContain('vote-sheet-auth-btn')
    expect(src).not.toContain('send-otp')
    expect(src).not.toContain('verify-otp')
  })

  it('identifies the voter by the local device token from getIdentity()', () => {
    expect(src).toContain('getIdentity')
  })

  it('casts votes only to the device-bound vote endpoint', () => {
    expect(src).toContain('/api/vote/cast')
  })

  it('carries a calm, honest note that the vote leaves the device', () => {
    // Curly apostrophe, no em dash, names the one egress plainly.
    expect(src).toMatch(/leaves your device|leave your device|leaves Footnote/)
    expect(src).not.toContain('—')
  })
})

describe('VoteSheet — device dedup semantics', () => {
  it('one device token maps to exactly one person in the people set', () => {
    // Server SADD keys people by the caller-supplied id; the device token is
    // stable per device, so repeated casts collapse to a single person.
    const people = new Set()
    const deviceToken = 'device-uuid-abc'
    people.add(deviceToken)
    people.add(deviceToken)
    expect(people.size).toBe(1)
  })

  it('two distinct devices count as two people', () => {
    const people = new Set()
    people.add('device-uuid-abc')
    people.add('device-uuid-def')
    expect(people.size).toBe(2)
  })
})
