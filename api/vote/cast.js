export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { featureId, userId, token: clientToken } = req.body
  if (!featureId || !userId) return res.status(400).json({ error: 'featureId and userId required' })

  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const h = { Authorization: `Bearer ${token}` }

  // Verify token matches userId when provided (device-UUID path skips this)
  if (clientToken) {
    const lookup = await fetch(`${base}/get/token:${clientToken}`, { headers: h })
    const { result: storedUserId } = await lookup.json()
    if (storedUserId !== userId) return res.status(403).json({ error: 'invalid token' })
  }

  // Per-user throttle: max 1 cast/second
  const throttleKey = `votes:throttle:${userId}`
  const throttle = await fetch(`${base}/get/${throttleKey}`, { headers: h })
  const { result: throttled } = await throttle.json()
  if (throttled) return res.status(429).json({ error: 'slow down' })
  await fetch(`${base}/set/${throttleKey}/1/EX/1`, { method: 'POST', headers: h })

  try {
    await Promise.all([
      fetch(`${base}/incr/votes:taps:${featureId}`, { method: 'POST', headers: h }),
      fetch(`${base}/sadd/votes:people:${featureId}/${userId}`, { method: 'POST', headers: h }),
    ])
  } catch (err) {
    console.error('KV write error:', err.message)
    return res.status(500).json({ error: 'Vote recording failed.' })
  }

  res.json({ ok: true })
}
