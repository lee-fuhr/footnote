import { randomUUID } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { phone, code } = req.body
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' })

  const creds = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
  const url = `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SID}/VerificationChecks`

  let r, body
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Code: code }),
      signal: AbortSignal.timeout(8000),
    })
    body = await r.json()
  } catch (err) {
    console.error('Twilio verify-otp error:', err.message)
    return res.status(503).json({ error: 'Verification failed. Try again.' })
  }

  if (body.status !== 'approved') {
    return res.status(400).json({ error: 'Incorrect code. Please try again.' })
  }

  const userId = randomUUID()
  const authToken = randomUUID()

  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const h = { Authorization: `Bearer ${kvToken}` }

  // Store token → userId mapping (30-day TTL). Phone discarded — never stored.
  await fetch(`${base}/set/token:${authToken}/${userId}/EX/${30 * 24 * 60 * 60}`, { method: 'POST', headers: h })

  res.status(200).json({ userId, token: authToken })
}
