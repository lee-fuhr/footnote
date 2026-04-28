import { FEATURES } from '../../src/features.js'

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || ''
  const expected = 'Basic ' + Buffer.from(`admin:${process.env.ADMIN_PASSWORD}`).toString('base64')
  if (authHeader !== expected) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Footnote Admin"')
    return res.status(401).send('Unauthorized')
  }

  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const h = { Authorization: `Bearer ${token}` }

  const results = await Promise.all(
    FEATURES.map(async f => {
      const [tapsR, peopleR] = await Promise.all([
        fetch(`${base}/get/votes:taps:${f.id}`, { headers: h }).then(r => r.json()),
        fetch(`${base}/scard/votes:people:${f.id}`, { headers: h }).then(r => r.json()),
      ])
      return {
        id: f.id,
        label: f.label,
        taps: parseInt(tapsR.result || '0'),
        people: parseInt(peopleR.result || '0'),
      }
    })
  )

  res.json(results)
}
