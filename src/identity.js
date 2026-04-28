const DEVICE_KEY = 'footnote_device_id'
const AUTH_KEY = 'footnote_auth'

export function getIdentity() {
  const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
  if (auth) return { type: 'user', userId: auth.userId }
  let deviceId = localStorage.getItem(DEVICE_KEY)
  if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, deviceId) }
  return { type: 'device', userId: deviceId }
}

export function setAuth(userId, token) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ userId, token, createdAt: Date.now() }))
}

export function isAuthExpired() {
  const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
  if (!auth) return false
  return Date.now() - auth.createdAt > 30 * 24 * 60 * 60 * 1000
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}
