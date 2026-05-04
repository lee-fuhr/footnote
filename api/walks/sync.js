// POST /api/walks/sync — app saves a walk on session end (no auth — personal single-user app)
// GET  /api/walks/sync?since=<epoch_ms>&limit=<n> — pipeline polls for new walks (requires x-footnote-key)
//
// Redis layout:
//   walk:{id}       → JSON string  {id, content, startedAt, endedAt, syncedAt}
//   walks:index     → sorted set   score=startedAt, member=id  (enables ?since= range queries)

const PIPELINE_KEY = process.env.FOOTNOTE_PIPELINE_KEY

function kvHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

async function kv(base, token, method, path) {
  const r = await fetch(`${base}/${path}`, { method, headers: kvHeaders(token) })
  if (!r.ok) throw new Error(`Redis ${path}: HTTP ${r.status}`)
  return r.json()
}

export default async function handler(req, res) {
  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (!base || !token) return res.status(503).json({ error: 'storage not configured' })

  // ── POST: save a walk ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { id, content, startedAt, endedAt } = req.body ?? {}
    if (!id || !content || !startedAt) {
      return res.status(400).json({ error: 'id, content, startedAt required' })
    }
    if (typeof id !== 'string' || id.length > 128) {
      return res.status(400).json({ error: 'invalid id' })
    }
    if (typeof content !== 'string' || content.length > 500_000) {
      return res.status(400).json({ error: 'content too large' })
    }

    const syncedAt = Date.now()
    const walk = { id, content, startedAt, endedAt: endedAt ?? null, syncedAt }
    const encoded = encodeURIComponent(JSON.stringify(walk))

    try {
      await Promise.all([
        kv(base, token, 'POST', `set/walk:${id}/${encoded}`),
        kv(base, token, 'POST', `zadd/walks:index/${startedAt}/${encodeURIComponent(id)}`),
      ])
    } catch (err) {
      console.error('walks/sync POST error:', err.message)
      return res.status(500).json({ error: 'storage error' })
    }

    return res.status(200).json({ ok: true, syncedAt })
  }

  // ── GET: fetch walks for pipeline ────────────────────────────────────────
  if (req.method === 'GET') {
    const key = req.headers['x-footnote-key']
    if (!PIPELINE_KEY) {
      return res.status(503).json({ error: 'pipeline key not configured' })
    }
    if (key !== PIPELINE_KEY) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const since = parseInt(req.query.since ?? '0', 10)
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100)
    // Use MAX_SAFE_INTEGER instead of +inf to avoid URL encoding issues with +
    const maxScore = Number.MAX_SAFE_INTEGER

    let ids
    try {
      const rangeData = await kv(
        base, token, 'GET',
        `zrangebyscore/walks:index/${since}/${maxScore}/LIMIT/0/${limit}`,
      )
      ids = rangeData.result ?? []
    } catch (err) {
      console.error('walks/sync GET range error:', err.message)
      return res.status(500).json({ error: 'storage error' })
    }

    if (ids.length === 0) return res.status(200).json({ walks: [] })

    const walks = await Promise.all(ids.map(async id => {
      try {
        const data = await kv(base, token, 'GET', `get/walk:${encodeURIComponent(id)}`)
        if (!data.result) return null
        return JSON.parse(data.result)
      } catch {
        return null
      }
    }))

    return res.status(200).json({ walks: walks.filter(Boolean) })
  }

  return res.status(405).end()
}
