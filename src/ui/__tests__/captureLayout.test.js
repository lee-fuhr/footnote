/**
 * Behavioral tests for captureLayout — the deterministic math behind the two
 * real-device walk-editor bugs.
 *
 * Bug #1: the auto-grow textarea must stay BOUNDED so a period / iOS
 *   double-space-to-period / rapid input can never balloon the flex layout.
 * Bug #2: during an active walk, capture must reliably pin the newest line to
 *   the bottom, but back off when the user scrolls up to read.
 *
 * These assert the logic, not the viewport. The actual soft-keyboard layout is
 * device-verified.
 */
import { describe, it, expect } from 'vitest'
import {
  autoGrowHeight,
  captureMaxHeight,
  shouldPinToBottom,
  isScrolledAwayFromBottom,
} from '../captureLayout.js'

describe('autoGrowHeight — bounded auto-grow (bug #1)', () => {
  it('grows to fit content while under the cap, overflow stays hidden', () => {
    expect(autoGrowHeight(120, 300)).toEqual({ height: 120, overflow: 'hidden' })
  })

  it('clamps to the cap and switches to internal scroll once content exceeds it', () => {
    expect(autoGrowHeight(900, 300)).toEqual({ height: 300, overflow: 'auto' })
  })

  it('clamps exactly at the cap', () => {
    expect(autoGrowHeight(300, 300)).toEqual({ height: 300, overflow: 'auto' })
  })

  it('never returns a height larger than the cap no matter how big scrollHeight gets', () => {
    // Simulates the runaway accumulation that broke Lee's layout: even an
    // absurd measured height must be clamped.
    const { height } = autoGrowHeight(100000, 300)
    expect(height).toBeLessThanOrEqual(300)
  })

  it('treats garbage / zero scrollHeight as zero height (no NaN, no negative)', () => {
    expect(autoGrowHeight(0, 300)).toEqual({ height: 0, overflow: 'hidden' })
    expect(autoGrowHeight(NaN, 300).height).toBe(0)
    expect(autoGrowHeight(-50, 300).height).toBe(0)
  })
})

describe('captureMaxHeight — viewport-relative cap', () => {
  it('caps at the given fraction of the viewport', () => {
    expect(captureMaxHeight(800, 0.4)).toBe(320)
  })

  it('never drops below the floor even on a tiny viewport', () => {
    // With the soft keyboard up the usable viewport can be very short; the
    // input must still fit at least ~two lines.
    expect(captureMaxHeight(100, 0.4, 88)).toBe(88)
  })

  it('falls back to the floor for a missing/invalid viewport', () => {
    expect(captureMaxHeight(0)).toBe(88)
    expect(captureMaxHeight(undefined)).toBe(88)
  })
})

describe('shouldPinToBottom — pin during a walk (bug #2)', () => {
  const farUp = { scrollTop: 0, clientHeight: 200, scrollHeight: 2000 }
  const atBottom = { scrollTop: 1800, clientHeight: 200, scrollHeight: 2000 }

  it('pins during an active walk even when scrolled far from the bottom', () => {
    expect(shouldPinToBottom(farUp, { activeWalk: true })).toBe(true)
  })

  it('does NOT pin during a walk if the user has deliberately scrolled up', () => {
    expect(shouldPinToBottom(farUp, { activeWalk: true, userScrolledUp: true })).toBe(false)
  })

  it('outside a walk, only pins when already resting near the bottom', () => {
    expect(shouldPinToBottom(atBottom, { activeWalk: false })).toBe(true)
    expect(shouldPinToBottom(farUp, { activeWalk: false })).toBe(false)
  })
})

describe('isScrolledAwayFromBottom — detect intentional read-back', () => {
  it('is false when resting at the bottom', () => {
    expect(isScrolledAwayFromBottom({ scrollTop: 1800, clientHeight: 200, scrollHeight: 2000 })).toBe(false)
  })

  it('is true when the user has scrolled up past the slack', () => {
    expect(isScrolledAwayFromBottom({ scrollTop: 500, clientHeight: 200, scrollHeight: 2000 })).toBe(true)
  })

  it('tolerates sub-pixel / momentum overscroll within the slack', () => {
    expect(isScrolledAwayFromBottom({ scrollTop: 1785, clientHeight: 200, scrollHeight: 2000 }, 24)).toBe(false)
  })
})
