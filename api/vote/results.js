import { FEATURES } from '../../src/features.js'

export default async function handler(req, res) {
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
        desc: f.desc,
        taps: parseInt(tapsR.result || '0'),
        people: parseInt(peopleR.result || '0'),
      }
    })
  )

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
  res.json(results)
}
