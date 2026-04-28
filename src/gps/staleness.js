export const STALE_MS = 60 * 1000

/** Pure function — returns 'live' | 'stale' | 'unavailable' based on capturedAt epoch ms. */
export function getLocationStatus(capturedAt) {
  if (capturedAt === null || capturedAt === undefined) return 'unavailable'
  return Date.now() - capturedAt < STALE_MS ? 'live' : 'stale'
}
