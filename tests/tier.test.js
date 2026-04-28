import { describe, it, expect, beforeEach } from 'vitest'
import { getTier, setTier, canUseCoda, canAutoCoda, ALPHA_DEFAULT_TIER } from '../src/tier.js'

describe('tier.js — client-side tier single source of truth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to the alpha default tier when no tier is stored', () => {
    expect(getTier()).toBe(ALPHA_DEFAULT_TIER)
    expect(ALPHA_DEFAULT_TIER).toBe('pro')
  })

  it('returns the stored tier when one is set', () => {
    setTier('free')
    expect(getTier()).toBe('free')
    setTier('ai-pack')
    expect(getTier()).toBe('ai-pack')
  })

  it('ignores invalid tier values', () => {
    setTier('pro')
    setTier('nonsense')
    expect(getTier()).toBe('pro')
  })

  it('canUseCoda: true for pro and ai-pack, false for free', () => {
    setTier('free')
    expect(canUseCoda()).toBe(false)
    setTier('pro')
    expect(canUseCoda()).toBe(true)
    setTier('ai-pack')
    expect(canUseCoda()).toBe(true)
  })

  it('canAutoCoda: only true for ai-pack', () => {
    setTier('free')
    expect(canAutoCoda()).toBe(false)
    setTier('pro')
    expect(canAutoCoda()).toBe(false)
    setTier('ai-pack')
    expect(canAutoCoda()).toBe(true)
  })

  it('alpha default grants Coda access without any tier set', () => {
    // This is the alpha behavior — everyone on Pro by default
    expect(canUseCoda()).toBe(true)
  })
})
