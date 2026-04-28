// Founder counter — number of users who actually paid the $0.99 founder price.
// Reads `founder:paid_count` from KV (a simple INCR counter incremented by the
// payment webhook in Phase 3). Until Phase 3 ships, this returns 0 and the
// pricing page renders "first 25 only" — honest, not placeholder.

const FETCH_TIMEOUT_MS = 3000

function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

export default async function handler(req, res) {
  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!base || !token) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(503).json({ error: 'storage unavailable' })
  }

  try {
    const r = await fetchWithTimeout(`${base}/get/founder:paid_count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(502).json({ error: 'storage read failed' })
    }
    const data = await r.json()
    const paid = parseInt(data.result || '0', 10) || 0
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    res.status(200).json({ paid, total: 25, remaining: Math.max(0, 25 - paid) })
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store')
    if (err?.name === 'AbortError') return res.status(504).json({ error: 'storage timeout' })
    console.error('founders/count error:', err?.message || err)
    res.status(500).json({ error: 'server error' })
  }
}
