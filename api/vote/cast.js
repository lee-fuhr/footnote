// Device-bound voting. One vote per device, no account, no OTP, no token.
// The caller sends a stable local device id (body.deviceId, with legacy
// body.userId and the x-device-id header accepted as fallbacks). People are
// deduped server-side by that id via Redis SADD, so a device that votes twice
// still counts as one person.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const body = req.body || {}
  const deviceId = body.deviceId || body.userId || req.headers?.['x-device-id']
  const { featureId } = body
  if (!featureId || !deviceId) {
    return res.status(400).json({ error: 'featureId and a device id are required' })
  }

  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const h = { Authorization: `Bearer ${token}` }

  // Per-device throttle: max 1 cast/second
  const throttleKey = `votes:throttle:${deviceId}`
  const throttle = await fetch(`${base}/get/${throttleKey}`, { headers: h })
  const { result: throttled } = await throttle.json()
  if (throttled) return res.status(429).json({ error: 'slow down' })
  await fetch(`${base}/set/${throttleKey}/1/EX/1`, { method: 'POST', headers: h })

  try {
    await Promise.all([
      fetch(`${base}/incr/votes:taps:${featureId}`, { method: 'POST', headers: h }),
      fetch(`${base}/sadd/votes:people:${featureId}/${deviceId}`, { method: 'POST', headers: h }),
    ])
  } catch (err) {
    console.error('KV write error:', err.message)
    return res.status(500).json({ error: 'Vote recording failed.' })
  }

  res.json({ ok: true })
}
