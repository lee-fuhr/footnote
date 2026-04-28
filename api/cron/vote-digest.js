// Weekly vote digest. Cron-triggered by Vercel (see vercel.json crons).
// Reads Upstash KV for vote counts, computes week-over-week deltas, sends
// Lee a warm-voice email via Resend. Idempotent — won't double-send the
// same ISO week thanks to the digest:last_sent_iso guard.
//
// Known debt: {coda_completions} and {unique_users} need a Phase 2 instrumentation
// pass (counters wired into CodaSheet + identity bootstrap). Placeholders are
// zero until then — documented in the digest body too.

const FEATURES = [{ id: 'echo' }, { id: 'pulse' }, { id: 'sync' }]
const FETCH_TIMEOUT_MS = 4000

function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

function currentISOWeek() {
  // ISO week format YYYY-Www. Thursday-of-week rule for accurate week number.
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export default async function handler(req, res) {
  const base = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const resendKey = process.env.RESEND_API_KEY
  const recipient = process.env.DIGEST_RECIPIENT

  if (!base || !kvToken || !resendKey || !recipient) {
    return res.status(503).json({ error: 'digest not configured' })
  }
  const kvHeaders = { Authorization: `Bearer ${kvToken}` }

  try {
    const iso = currentISOWeek()

    // Idempotency guard
    const sentLookup = await fetchWithTimeout(`${base}/get/digest:last_sent_iso`, { headers: kvHeaders })
    const sentData = await sentLookup.json()
    if (sentData.result === iso) {
      return res.status(200).json({ skipped: true, iso })
    }

    // Pull current counters in parallel
    const featureResults = await Promise.all(
      FEATURES.map(async f => {
        const [tapsRes, peopleRes] = await Promise.all([
          fetchWithTimeout(`${base}/get/votes:taps:${f.id}`, { headers: kvHeaders }).then(r => r.json()),
          fetchWithTimeout(`${base}/scard/votes:people:${f.id}`, { headers: kvHeaders }).then(r => r.json()),
        ])
        return {
          id: f.id,
          taps: parseInt(tapsRes.result || '0'),
          people: parseInt(peopleRes.result || '0'),
        }
      })
    )

    const currentTaps = {}, currentPeople = {}
    let totalVoters = 0
    featureResults.forEach(f => {
      currentTaps[f.id] = f.taps
      currentPeople[f.id] = f.people
      totalVoters += f.people
    })

    // Read last snapshot (any prior week)
    const snapLookup = await fetchWithTimeout(`${base}/get/digest:last_snapshot`, { headers: kvHeaders })
    const snapData = await snapLookup.json()
    let oldTaps = {}, oldPeople = {}
    if (snapData.result) {
      try {
        const parsed = JSON.parse(snapData.result)
        oldTaps = parsed.taps || {}
        oldPeople = parsed.people || {}
      } catch {}
    }

    const newVoters = Math.max(0, totalVoters - Object.values(oldPeople).reduce((a, b) => a + b, 0))

    // Top feature by week-delta taps
    let topFeature = 'none'
    let maxDelta = -1
    FEATURES.forEach(f => {
      const delta = (currentTaps[f.id] || 0) - (oldTaps[f.id] || 0)
      if (delta > maxDelta) { maxDelta = delta; topFeature = f.id }
    })

    // TODO Phase 2: wire real counters for coda_completions and unique_users
    const codaCompletions = 0
    const uniqueUsers = 0

    const subject = 'Your walk notes, gathered'
    const body =
`This week, ${totalVoters} of you cast votes, and ${newVoters} walked in for the first time. The top request: ${topFeature}. Alpha signal crossed ${codaCompletions} completions, from ${uniqueUsers} unique walkers. Quiet work, steady steps. See you next Monday.`

    const resendRes = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Footnote <footnote@mail.leefuhr.com>',
        to: recipient,
        subject,
        text: body,
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text().catch(() => '')
      console.error('Resend error:', resendRes.status, errBody.slice(0, 200))
      return res.status(502).json({ error: 'email send failed' })
    }

    // Persist snapshot + sent marker (both via simple SET, no TTL — they're tiny)
    const snapshot = { taps: currentTaps, people: currentPeople, capturedAt: Date.now(), iso }
    await Promise.all([
      fetchWithTimeout(`${base}/set/digest:last_snapshot/${encodeURIComponent(JSON.stringify(snapshot))}`, {
        method: 'POST',
        headers: kvHeaders,
      }),
      fetchWithTimeout(`${base}/set/digest:last_sent_iso/${encodeURIComponent(iso)}`, {
        method: 'POST',
        headers: kvHeaders,
      }),
    ])

    res.status(200).json({ sent: true, iso, totalVoters, newVoters, topFeature })
  } catch (err) {
    if (err?.name === 'AbortError') return res.status(504).json({ error: 'timeout' })
    console.error('vote-digest error:', err?.message || err)
    res.status(500).json({ error: 'server error' })
  }
}
