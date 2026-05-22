/**
 * Label + typography guardrail for GpsIndicator.
 * The stale state must read "no signal" (not "lost"), the low-accuracy state
 * "weak signal". No em dashes in user-facing copy.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'GpsIndicator.js'),
  'utf8',
)

describe('GpsIndicator — status labels', () => {
  it('stale state reads "no signal", not "lost"', () => {
    const line = src.split('\n').find(l => l.includes("'gps-stale':") && l.includes('signal'))
    expect(line).toBeTruthy()
    expect(line).toContain('no signal')
    expect(src).not.toMatch(/'gps-stale':\s*'lost'/)
  })

  it('low-accuracy state reads "weak signal"', () => {
    expect(src).toMatch(/'gps-live-low':\s*'weak signal'/)
  })

  it('stale aria copy describes no signal, not lost', () => {
    const aria = src
      .split('\n')
      .find(l => l.includes("'gps-stale':") && l.includes('last known'))
    expect(aria).toBeTruthy()
    expect(aria.toLowerCase()).toContain('no signal')
    expect(aria.toLowerCase()).not.toContain('lost')
  })

  it('has no em dash in user-facing copy', () => {
    expect(src).not.toContain('—')
  })
})
