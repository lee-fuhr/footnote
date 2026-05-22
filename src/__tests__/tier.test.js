import { describe, it, expect, beforeEach } from 'vitest'
import { setTier, ALPHA_AI_PACK_FREE, hasAiPackAccess } from '../tier.js'

describe('tier.js — friends alpha AI Pack unlock', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('AI Pack is free for everyone while the alpha flag is on', () => {
    expect(ALPHA_AI_PACK_FREE).toBe(true)
    setTier('free')
    expect(hasAiPackAccess()).toBe(true)
    setTier('pro')
    expect(hasAiPackAccess()).toBe(true)
    setTier('ai-pack')
    expect(hasAiPackAccess()).toBe(true)
  })

  it('with no tier set (alpha default), AI Pack access is granted', () => {
    expect(hasAiPackAccess()).toBe(true)
  })

  it('ai-pack tier always has access regardless of the alpha flag', () => {
    // hasAiPackAccess must still honor a real ai-pack tier so the gate snaps back
    // cleanly when ALPHA_AI_PACK_FREE is flipped off at alpha-end.
    setTier('ai-pack')
    expect(hasAiPackAccess()).toBe(true)
  })
})
