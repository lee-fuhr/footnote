// Cost per Twilio Verify SMS (US). Update when Twilio pricing changes or when
// enabling international. 0.79 cents per message is the May 2026 US baseline.
const TWILIO_COST_CENTS_PER_SMS = 0.79

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { phone } = req.body
  if (!phone) return res.status(400).json({ error: 'phone required' })

  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const h = { Authorization: `Bearer ${token}` }

  // Budget guard: soft cap on Twilio spend during alpha. Prevents silent credit drain
  // from runaway retries or bugs. Raise TWILIO_BUDGET_CENTS in Vercel env to expand.
  // Default 500 cents = $5 soft cap. Counter resets only when Lee sets it to 0 manually.
  const budgetCap = parseInt(process.env.TWILIO_BUDGET_CENTS || '500')
  const spentRes = await fetch(`${base}/get/twilio:budget:spent_cents`, { headers: h })
  const spentData = await spentRes.json()
  const spent = parseFloat(spentData.result || '0')
  if (spent >= budgetCap) {
    console.warn('Twilio budget reached:', spent, 'cap:', budgetCap)
    return res.status(503).json({ error: 'SMS temporarily unavailable. Please reach out for an invite.' })
  }

  // Rate limit: 1 OTP per phone per 10 min
  const rateLimitKey = `ratelimit:otp:${encodeURIComponent(phone)}`
  const existing = await fetch(`${base}/get/${rateLimitKey}`, { headers: h })
  const existingData = await existing.json()
  if (existingData.result) {
    return res.status(429).json({ error: 'wait 10 minutes before requesting another code' })
  }
  await fetch(`${base}/set/${rateLimitKey}/1/EX/600`, { method: 'POST', headers: h })

  const url = `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SID}/Verifications`
  const creds = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')

  let r
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error('Twilio send-otp error:', err.message)
    return res.status(503).json({ error: 'SMS delivery failed. Try again.' })
  }

  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    console.error('Twilio error response:', body)
    return res.status(400).json({ error: 'Invalid phone number.' })
  }

  // Increment spend counter using INCRBYFLOAT (supports sub-cent increments).
  await fetch(`${base}/incrbyfloat/twilio:budget:spent_cents/${TWILIO_COST_CENTS_PER_SMS}`, { method: 'POST', headers: h })

  // Phone discarded — never persisted
  res.status(200).json({ ok: true })
}
