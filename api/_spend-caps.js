// Spend caps for the AI Insights endpoint.
// During the friends alpha, AI Pack is free for everyone (the payment/tier gate is
// bypassed client-side), so the only thing standing between us and a runaway bill is
// these server-side caps. This is the real enforcement point.
//
// Two layers:
//   • Per-person  — a single device can't burn through more than its daily share.
//   • Global      — the whole alpha can't exceed a daily ceiling, no matter how
//                    many devices are active.
//
// Both layers track BOTH request volume and estimated spend (cents). Whichever
// trips first wins. All values are tunable below — bump them as the alpha grows.

export const CAPS = {
  // ── Per person (per device, per day) ───────────────────────────────────── //
  PERSON_MAX_REQUESTS_PER_DAY: 12, // analyses per device per day
  PERSON_MAX_CENTS_PER_DAY: 50, // 50¢/device/day of AI spend

  // ── Global (all devices combined, per day) ─────────────────────────────── //
  GLOBAL_MAX_REQUESTS_PER_DAY: 400, // total analyses across everyone per day
  GLOBAL_MAX_CENTS_PER_DAY: 500, // $5/day total AI spend (matches legacy DAILY_LLM_BUDGET_CENTS)
}

/**
 * Decide whether a single device has hit its daily allotment.
 * @param {{requests?: number, spentCents?: number}} usage - today's counters for this device
 * @returns {{capped: boolean, reason: string|null}}
 */
export function checkPersonCap(usage = {}) {
  const requests = usage.requests ?? 0
  const spentCents = usage.spentCents ?? 0
  if (requests >= CAPS.PERSON_MAX_REQUESTS_PER_DAY) {
    return { capped: true, reason: 'person_request_cap' }
  }
  if (spentCents >= CAPS.PERSON_MAX_CENTS_PER_DAY) {
    return { capped: true, reason: 'person_spend_cap' }
  }
  return { capped: false, reason: null }
}

/**
 * Decide whether the whole alpha has hit its daily ceiling.
 * @param {{requests?: number, spentCents?: number}} usage - today's totals across all devices
 * @returns {{capped: boolean, reason: string|null}}
 */
export function checkGlobalCap(usage = {}) {
  const requests = usage.requests ?? 0
  const spentCents = usage.spentCents ?? 0
  if (spentCents >= CAPS.GLOBAL_MAX_CENTS_PER_DAY) {
    return { capped: true, reason: 'global_spend_cap' }
  }
  if (requests >= CAPS.GLOBAL_MAX_REQUESTS_PER_DAY) {
    return { capped: true, reason: 'global_request_cap' }
  }
  return { capped: false, reason: null }
}

/**
 * Normalize a client-supplied device id into a safe, bounded Redis key segment.
 * Falls back to "anon" so a missing id still gets pooled into one shared bucket
 * rather than slipping past the per-person cap entirely.
 * @param {string|null|undefined} id
 * @returns {string}
 */
export function deviceKey(id) {
  if (!id || typeof id !== 'string') return 'anon'
  const cleaned = id.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!cleaned) return 'anon'
  return cleaned.slice(0, 64)
}
