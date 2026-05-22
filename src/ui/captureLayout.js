/**
 * captureLayout: pure, viewport-free helpers for the walk-capture textarea.
 *
 * These functions hold the deterministic math behind two real-device bugs:
 *   1. The auto-grow textarea ballooning the flex layout (period / double-tap).
 *   2. Keeping the newest line + cursor pinned to the bottom during a walk.
 *
 * They take plain numbers / shapes so they can be unit-tested in a node env
 * with no DOM. The actual element wiring lives in Editor.js; the soft-keyboard
 * behavior they're guarding against can only be fully confirmed on-device.
 */

/**
 * Decide the bounded height + overflow for an auto-growing textarea.
 *
 * The caller MUST reset the textarea height to 'auto' before reading
 * scrollHeight, so scrollHeight reflects the true content height and does not
 * accumulate from the previous (already-grown) height. This function then
 * clamps that measured height to `maxPx`. Past the cap the textarea stops
 * growing and scrolls its own content (overflow 'auto') instead of pushing the
 * surrounding flex layout off-screen.
 *
 * @param {number} scrollHeight - measured content height in px (after reset)
 * @param {number} maxPx - the largest height the textarea may occupy
 * @returns {{ height: number, overflow: 'hidden' | 'auto' }}
 */
export function autoGrowHeight(scrollHeight, maxPx) {
  const measured = Number.isFinite(scrollHeight) && scrollHeight > 0 ? scrollHeight : 0
  const cap = Number.isFinite(maxPx) && maxPx > 0 ? maxPx : Infinity

  if (measured >= cap) {
    return { height: cap, overflow: 'auto' }
  }
  return { height: measured, overflow: 'hidden' }
}

/**
 * Compute the max height the capture textarea may occupy, as a fraction of the
 * available viewport height. Keeps the input from ever eating the whole screen
 * (and the footer) when the soft keyboard shrinks the viewport.
 *
 * @param {number} viewportHeight - usable viewport height in px (e.g. visualViewport.height)
 * @param {number} [fraction=0.4] - share of the viewport the input may take
 * @param {number} [floorPx=88] - never cap below this (≈ two lines), so short input always fits
 * @returns {number}
 */
export function captureMaxHeight(viewportHeight, fraction = 0.4, floorPx = 88) {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return floorPx
  return Math.max(floorPx, Math.round(viewportHeight * fraction))
}

/**
 * Decide whether capture should pin the newest content to the bottom.
 *
 * During an active walk we pin reliably so the latest line + cursor stay
 * visible above the keyboard, UNLESS the user has deliberately scrolled up to
 * read earlier text, in which case we leave them alone. When not in an active
 * walk we fall back to the gentle "only if already near the bottom" behavior so
 * we never yank a reader who is browsing history.
 *
 * @param {{ scrollTop: number, clientHeight: number, scrollHeight: number }} metrics
 * @param {{ activeWalk?: boolean, userScrolledUp?: boolean, threshold?: number }} [opts]
 * @returns {boolean}
 */
export function shouldPinToBottom(metrics, opts = {}) {
  const { scrollTop = 0, clientHeight = 0, scrollHeight = 0 } = metrics || {}
  const { activeWalk = false, userScrolledUp = false, threshold = 40 } = opts

  if (activeWalk) {
    // Pin during a walk unless the user is intentionally reading back.
    return !userScrolledUp
  }
  // Not walking: only pin if the view is already resting near the bottom.
  return scrollTop + clientHeight >= scrollHeight - threshold
}

/**
 * Given a scroll container's metrics, decide if the user has scrolled up far
 * enough from the bottom that we should stop auto-pinning until new content
 * arrives (or they refocus). A small slack absorbs sub-pixel rounding and
 * momentum overscroll.
 *
 * @param {{ scrollTop: number, clientHeight: number, scrollHeight: number }} metrics
 * @param {number} [slack=24]
 * @returns {boolean}
 */
export function isScrolledAwayFromBottom(metrics, slack = 24) {
  const { scrollTop = 0, clientHeight = 0, scrollHeight = 0 } = metrics || {}
  return scrollTop + clientHeight < scrollHeight - slack
}
