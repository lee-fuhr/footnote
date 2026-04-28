export const GAP_MS = 30 * 60 * 1000

/** Returns true if enough time has passed since lastHeartbeat to warrant a new session. */
export function shouldStartNewSession(lastHeartbeat) {
  if (lastHeartbeat === null || lastHeartbeat === undefined) return false
  return Date.now() - lastHeartbeat >= GAP_MS
}
