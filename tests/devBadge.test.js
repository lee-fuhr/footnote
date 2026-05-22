import { describe, it, expect } from 'vitest'
import { shouldShowDevBadge, formatBadgeLabel } from '../src/devBadge.js'

describe('shouldShowDevBadge', () => {
  it('is hidden by default (no flag) — keeps debug chrome out of shipped builds', () => {
    const storage = { getItem: () => null }
    expect(shouldShowDevBadge(storage)).toBe(false)
  })

  it('is hidden when the flag is any value other than "1"', () => {
    const storage = { getItem: () => 'true' }
    expect(shouldShowDevBadge(storage)).toBe(false)
  })

  it('shows only when fn_dev === "1"', () => {
    const storage = { getItem: (k) => (k === 'fn_dev' ? '1' : null) }
    expect(shouldShowDevBadge(storage)).toBe(true)
  })

  it('fails closed (hidden) when storage access throws', () => {
    const storage = { getItem: () => { throw new Error('blocked') } }
    expect(shouldShowDevBadge(storage)).toBe(false)
  })
})

describe('formatBadgeLabel', () => {
  it('formats as M/D H:MM with zero-padded minutes', () => {
    // 2026-05-06T17:01 local
    const d = new Date(2026, 4, 6, 17, 1)
    expect(formatBadgeLabel(d)).toBe('5/6 17:01')
  })
})
