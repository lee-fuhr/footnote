import { describe, it, expect, beforeEach } from 'vitest'
import { isCoded, markCoded } from '../src/session/coded.js'

describe('session/coded.js — localStorage rename migration (Stack → Coda)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('markCoded adds a session id under the new key', () => {
    markCoded('s-1')
    const stored = JSON.parse(localStorage.getItem('footnote_coda_sessions'))
    expect(stored).toContain('s-1')
  })

  it('isCoded reads from the new key', () => {
    localStorage.setItem('footnote_coda_sessions', JSON.stringify(['s-1']))
    expect(isCoded('s-1')).toBe(true)
    expect(isCoded('s-2')).toBe(false)
  })

  it('migrates legacy key on first read: stacked_sessions → coda_sessions', () => {
    localStorage.setItem('footnote_stacked_sessions', JSON.stringify(['legacy-1', 'legacy-2']))
    expect(localStorage.getItem('footnote_coda_sessions')).toBe(null)

    // First read should trigger migration
    expect(isCoded('legacy-1')).toBe(true)

    // New key now has the data, legacy key is gone
    expect(localStorage.getItem('footnote_stacked_sessions')).toBe(null)
    const migrated = JSON.parse(localStorage.getItem('footnote_coda_sessions'))
    expect(migrated).toEqual(['legacy-1', 'legacy-2'])
  })

  it('does not overwrite new key if both exist', () => {
    localStorage.setItem('footnote_stacked_sessions', JSON.stringify(['old-only']))
    localStorage.setItem('footnote_coda_sessions', JSON.stringify(['new-winner']))
    isCoded('anything')
    const survivor = JSON.parse(localStorage.getItem('footnote_coda_sessions'))
    expect(survivor).toEqual(['new-winner'])
  })

  it('markCoded is idempotent', () => {
    markCoded('s-1')
    markCoded('s-1')
    const stored = JSON.parse(localStorage.getItem('footnote_coda_sessions'))
    expect(stored).toEqual(['s-1'])
  })
})
