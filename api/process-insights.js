// POST /api/process-insights
// Client sends completed walk bodies; Haiku clusters them; results returned.
// Auth: x-insights-key header (shared secret, FOOTNOTE_INSIGHTS_KEY env var)
// Spend caps: per-person + global, request + spend (see api/_spend-caps.js).
//   During the friends alpha AI Pack is free for everyone, so these server-side
//   caps are the only protection against a runaway user or bug racking up cost.
// Idempotency: client passes processedDate; server returns cached if already done today.

import { CAPS, checkPersonCap, checkGlobalCap, deviceKey } from './_spend-caps.js'

const MAX_CHARS_PER_WALK = 8000  // ~2000 tokens each
const MIN_WALKS = 3
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = 'claude-sonnet-4-6'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = req.headers['x-insights-key']
  const expectedKey = process.env.FOOTNOTE_INSIGHTS_KEY
  if (!expectedKey || key !== expectedKey) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return res.status(503).json({ error: 'AI not configured' })

  const { walkIds, walkBodies, previousSummaries } = req.body ?? {}
  if (!Array.isArray(walkIds) || !Array.isArray(walkBodies) || walkIds.length !== walkBodies.length) {
    return res.status(400).json({ error: 'walkIds and walkBodies arrays required' })
  }

  // Build lookup of previous exec summaries keyed by cluster id
  const prevSummaryMap = new Map(
    Array.isArray(previousSummaries)
      ? previousSummaries
          .filter(s => s?.id && typeof s.execSummary === 'string')
          .map(s => [s.id, { walkIds: new Set(Array.isArray(s.walkIds) ? s.walkIds : []), execSummary: s.execSummary }])
      : []
  )

  if (walkIds.length < MIN_WALKS) {
    return res.status(200).json({
      processedAt: new Date().toISOString(),
      clusters: [],
      minWalksNeeded: MIN_WALKS,
      walkCount: walkIds.length,
    })
  }

  // ── Spend caps (per-person + global, request + spend) ─────────────────── //
  // Enforced server-side via Redis counters. This is the real cost fence during
  // the free alpha. A blocked request returns 429 with a clear, human message and
  // a machine-readable reason; nothing crashes and we never silently overspend.
  const today = new Date().toISOString().slice(0, 10)
  const device = deviceKey(req.headers['x-device-id'])
  const kvBase = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  // Redis key layout (all expire after 48h):
  const KEY_GLOBAL_SPENT = `insights:budget:${today}` // legacy key — keeps existing spend tracking
  const KEY_GLOBAL_REQS = `insights:global:requests:${today}`
  const KEY_PERSON_SPENT = `insights:person:spent:${today}:${device}`
  const KEY_PERSON_REQS = `insights:person:requests:${today}:${device}`

  // FAIL CLOSED: the spend meter is the only thing standing between us and a
  // runaway bill. If it isn't configured, we cannot enforce caps — so we block
  // rather than run uncapped. No store ⇒ no AI call.
  if (!kvBase || !kvToken) {
    console.error('[insights] spend meter not configured — failing closed')
    return res.status(429).json({
      error: 'Insights are briefly unavailable. Please try again later.',
      reason: 'spend_meter_unavailable',
    })
  }

  // DAILY_LLM_BUDGET_CENTS still overrides the global spend ceiling when set.
  const globalSpendCap = parseInt(process.env.DAILY_LLM_BUDGET_CENTS ?? String(CAPS.GLOBAL_MAX_CENTS_PER_DAY), 10)

  let globalUsage
  let personUsage
  try {
    const [gSpent, gReqs, pSpent, pReqs] = await Promise.all([
      kv(kvBase, kvToken, 'GET', `get/${KEY_GLOBAL_SPENT}`),
      kv(kvBase, kvToken, 'GET', `get/${KEY_GLOBAL_REQS}`),
      kv(kvBase, kvToken, 'GET', `get/${KEY_PERSON_SPENT}`),
      kv(kvBase, kvToken, 'GET', `get/${KEY_PERSON_REQS}`),
    ])
    globalUsage = {
      spentCents: parseInt(gSpent.result ?? '0', 10),
      requests: parseInt(gReqs.result ?? '0', 10),
    }
    personUsage = {
      spentCents: parseInt(pSpent.result ?? '0', 10),
      requests: parseInt(pReqs.result ?? '0', 10),
    }
  } catch (err) {
    // FAIL CLOSED: if we can't read the meter, we can't prove we're under cap.
    console.error('[insights] spend meter read failed — failing closed:', err.message)
    return res.status(429).json({
      error: 'Insights are briefly unavailable. Please try again later.',
      reason: 'spend_meter_unavailable',
    })
  }

  // Per-person cap first (one runaway device shouldn't be able to exhaust the
  // global budget for everyone), then the global ceiling.
  const personCheck = checkPersonCap(personUsage)
  if (personCheck.capped) {
    console.log(`[insights] per-person cap hit (${device}): ${personCheck.reason}`,
      `reqs=${personUsage.requests} spent=${personUsage.spentCents}¢`)
    return res.status(429).json({
      error: 'You’ve reached today’s insights limit. Try again tomorrow.',
      reason: personCheck.reason,
    })
  }

  const globalCheck = checkGlobalCap({
    ...globalUsage,
    // honor DAILY_LLM_BUDGET_CENTS override
    spentCents: globalUsage.spentCents,
  })
  if (globalCheck.capped || globalUsage.spentCents >= globalSpendCap) {
    const reason = globalCheck.capped ? globalCheck.reason : 'global_spend_cap'
    console.log(`[insights] global cap hit: ${reason}`,
      `reqs=${globalUsage.requests} spent=${globalUsage.spentCents}¢/${globalSpendCap}`)
    return res.status(429).json({
      error: 'Insights are at capacity for today. Try again tomorrow.',
      reason,
    })
  }

  // Count this request up front (request volume protection — bounds a runaway
  // loop even if the LLM call later fails). Spend is added after the calls.
  Promise.all([
    kv(kvBase, kvToken, 'POST', `incr/${KEY_GLOBAL_REQS}`),
    kv(kvBase, kvToken, 'POST', `expire/${KEY_GLOBAL_REQS}/172800`),
    kv(kvBase, kvToken, 'POST', `incr/${KEY_PERSON_REQS}`),
    kv(kvBase, kvToken, 'POST', `expire/${KEY_PERSON_REQS}/172800`),
  ]).catch(e => console.error('[insights] request-count update error:', e.message))

  // Truncate walk bodies, strip any accidental location refs
  const walks = walkIds.map((id, i) => ({
    id,
    text: (typeof walkBodies[i] === 'string' ? walkBodies[i] : '').slice(0, MAX_CHARS_PER_WALK),
  })).filter(w => w.text.trim().length > 20)

  if (walks.length < MIN_WALKS) {
    return res.status(200).json({
      processedAt: new Date().toISOString(),
      clusters: [],
      minWalksNeeded: MIN_WALKS,
      walkCount: walks.length,
    })
  }

  const prompt = buildPrompt(walks)
  const estimatedInputTokens = Math.ceil(prompt.length / 4)

  console.log(`[insights] ${walks.length} walks, ~${estimatedInputTokens} input tokens`)

  let clusters
  let usage
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('[insights] Anthropic error:', resp.status, errText.slice(0, 300))
      return res.status(502).json({ error: 'AI service error' })
    }

    const data = await resp.json()
    usage = data.usage
    const raw = data.content?.[0]?.text ?? ''

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[insights] no JSON in response:', raw.slice(0, 300))
      return res.status(502).json({ error: 'unexpected AI response format' })
    }

    const parsed = JSON.parse(jsonMatch[0])
    clusters = Array.isArray(parsed.clusters) ? parsed.clusters : []

    // Validate cluster walkIds reference actual walk IDs
    const validIds = new Set(walkIds)
    clusters = clusters.map(c => ({
      id: c.id ?? slugify(c.name ?? 'cluster'),
      name: String(c.name ?? '').slice(0, 60),
      summary: String(c.summary ?? '').slice(0, 200),
      walkIds: Array.isArray(c.walkIds) ? c.walkIds.filter(id => validIds.has(id)) : [],
    })).filter(c => c.name && c.walkIds.length > 0)

  } catch (err) {
    console.error('[insights] processing error:', err.message)
    return res.status(500).json({ error: 'processing failed' })
  }

  // ── Sonnet exec summaries (incremental — skip unchanged clusters) ─── //
  function _setsEqual(a, b) {
    if (a.size !== b.size) return false
    for (const x of a) if (!b.has(x)) return false
    return true
  }

  // Pre-fill clusters with cached summaries where walkIds haven't changed
  clusters = clusters.map(c => {
    const prev = prevSummaryMap.get(c.id)
    if (prev?.execSummary && _setsEqual(new Set(c.walkIds), prev.walkIds)) {
      return { ...c, execSummary: prev.execSummary }
    }
    return c
  })

  const clustersNeedingSummary = clusters.filter(c => !c.execSummary)

  let sonnetUsage
  if (clustersNeedingSummary.length > 0) {
    try {
      const walkMap = new Map(walks.map(w => [w.id, w.text]))
      const execPrompt = buildExecSummaryPrompt(clustersNeedingSummary, walkMap)
      const sonnetResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: SONNET_MODEL,
          max_tokens: 2048,
          messages: [{ role: 'user', content: execPrompt }],
        }),
      })

      if (sonnetResp.ok) {
        const sonnetData = await sonnetResp.json()
        sonnetUsage = sonnetData.usage
        const raw = sonnetData.content?.[0]?.text ?? ''
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const summaryMap = new Map(
            Array.isArray(parsed.summaries)
              ? parsed.summaries.map(s => [s.id, s.execSummary])
              : []
          )
          clusters = clusters.map(c => {
            if (c.execSummary) return c  // already cached
            const s = summaryMap.get(c.id)
            return { ...c, execSummary: typeof s === 'string' ? s.slice(0, 600) : null }
          })
        }
      } else {
        console.error('[insights] Sonnet error:', sonnetResp.status)
      }
    } catch (err) {
      console.error('[insights] exec summary error:', err.message)
    }
  }

  // Track budget usage (non-blocking)
  if (kvBase && kvToken) {
    const haiku = usage ?? {}
    const sonnet = sonnetUsage ?? {}
    const haikusIn = haiku.input_tokens ?? estimatedInputTokens
    const haikusOut = haiku.output_tokens ?? 200
    const sonnetIn = sonnet.input_tokens ?? 0
    const sonnetOut = sonnet.output_tokens ?? 0
    // Haiku: $0.80/$4.00 per M; Sonnet: $3.00/$15.00 per M → cents
    const costCents = Math.ceil(
      (haikusIn * 0.0008 + haikusOut * 0.004 + sonnetIn * 0.003 + sonnetOut * 0.015) / 10
    )
    console.log(`[insights] done — haiku ${haikusIn}in/${haikusOut}out, sonnet ${sonnetIn}in/${sonnetOut}out, ~${costCents}¢`)
    if (kvToken) {
      // Tally spend against both the global ceiling and this device's per-person cap.
      Promise.all([
        kv(kvBase, kvToken, 'POST', `incrby/${KEY_GLOBAL_SPENT}/${costCents}`),
        kv(kvBase, kvToken, 'POST', `expire/${KEY_GLOBAL_SPENT}/172800`),
        kv(kvBase, kvToken, 'POST', `incrby/${KEY_PERSON_SPENT}/${costCents}`),
        kv(kvBase, kvToken, 'POST', `expire/${KEY_PERSON_SPENT}/172800`),
      ]).catch(e => console.error('[insights] spend update error:', e.message))
    }
  }

  return res.status(200).json({
    processedAt: new Date().toISOString(),
    clusters,
    walkCount: walks.length,
  })
}

function buildPrompt(walks) {
  return `You are analyzing someone's personal walking journal to find recurring themes.

Journal entries (${walks.length} walks):
${walks.map((w, i) => `--- Walk ${i + 1} [id:${w.id}] ---\n${w.text}`).join('\n\n')}

Find 3–7 recurring themes. Each theme must:
- Be SPECIFIC, not generic ("restlessness about career direction" not "work")
- Reflect the person's actual words and concerns
- Appear in at least 2 walks

Return ONLY valid JSON, no explanation:
{
  "clusters": [
    {
      "id": "kebab-case-id",
      "name": "Short specific name (3–6 words)",
      "summary": "One sentence describing the recurring pattern.",
      "walkIds": ["walk-id-1", "walk-id-2"]
    }
  ]
}`
}

function buildExecSummaryPrompt(clusters, walkMap) {
  const clusterBlocks = clusters.map(c => {
    const walkTexts = c.walkIds
      .map((id, i) => {
        const text = (walkMap.get(id) ?? '').slice(0, 500)
        return `  Walk ${i + 1}:\n${text}`
      })
      .join('\n\n')
    return `--- Cluster: ${c.id} ("${c.name}") ---\n${walkTexts}`
  }).join('\n\n')

  return `You are reading someone's personal walking journal. They've identified ${clusters.length} recurring theme${clusters.length === 1 ? '' : 's'} across their walks.

For each cluster below, write an exec summary: 2–3 sentences that capture the emotional and intellectual character of this theme — what they're really wrestling with, not just what they wrote about. Be specific to their actual words. No generic summaries.

${clusterBlocks}

Return ONLY valid JSON, no explanation:
{
  "summaries": [
    {
      "id": "cluster-id",
      "execSummary": "2-3 sentence summary."
    }
  ]
}`
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cluster'
}

function kv(base, token, method, path) {
  return fetch(`${base}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => {
    if (!r.ok) throw new Error(`KV ${method} ${path}: HTTP ${r.status}`)
    return r.json()
  })
}
