export const QUOTA_LEVELS = {
  ok: 0,
  log: 60,
  warn: 80,
  urgent: 90,
  block: 95,
}

/** Returns the quota level string for a given usage percentage (0-100). */
export function getQuotaLevel(percent) {
  if (percent >= QUOTA_LEVELS.block) return 'block'
  if (percent >= QUOTA_LEVELS.urgent) return 'urgent'
  if (percent >= QUOTA_LEVELS.warn) return 'warn'
  if (percent >= QUOTA_LEVELS.log) return 'log'
  return 'ok'
}

/** Estimates storage usage and returns { used, quota, percent, level }. */
export async function estimateStorage() {
  if (!navigator.storage?.estimate) {
    return { used: 0, quota: 0, percent: 0, level: 'ok' }
  }
  const { usage = 0, quota = 1 } = await navigator.storage.estimate()
  const percent = Math.round((usage / quota) * 100)
  return { used: usage, quota, percent, level: getQuotaLevel(percent) }
}

/** Requests persistent storage. Returns true if granted. */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}
