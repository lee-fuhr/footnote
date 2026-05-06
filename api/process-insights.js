// POST /api/process-insights
// Client sends completed walk bodies; Haiku clusters them; results returned.
// Auth: x-insights-key header (shared secret, FOOTNOTE_INSIGHTS_KEY env var)
// Budget: daily spend cap via DAILY_LLM_BUDGET_CENTS (default $5/day)
// Idempotency: client passes processedDate; server returns cached if already done today.

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

  const { walkIds, walkBodies } = req.body ?? {}
  if (!Array.isArray(walkIds) || !Array.isArray(walkBodies) || walkIds.length !== walkBodies.length) {
    return res.status(400).json({ error: 'walkIds and walkBodies arrays required' })
  }

  if (walkIds.length < MIN_WALKS) {
    return res.status(200).json({
      processedAt: new Date().toISOString(),
      clusters: [],
      minWalksNeeded: MIN_WALKS,
      walkCount: walkIds.length,
    })
  }

  // Budget check via Redis
  const today = new Date().toISOString().slice(0, 10)
  const kvBase = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (kvBase && kvToken) {
    try {
      const spent = await kv(kvBase, kvToken, 'GET', `get/insights:budget:${today}`)
      const budgetCents = parseInt(process.env.DAILY_LLM_BUDGET_CENTS ?? '500', 10)
      const spentCents = parseInt(spent.result ?? '0', 10)
      if (spentCents >= budgetCents) {
        console.log(`[insights] daily budget exhausted: ${spentCents}/${budgetCents}¢`)
        return res.status(429).json({ error: 'daily budget exceeded' })
      }
    } catch (err) {
      console.error('[insights] budget check error:', err.message)
    }
  }

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

  // ── Sonnet exec summaries (one batched call) ───────────────────────── //
  let sonnetUsage
  if (clusters.length > 0) {
    try {
      const walkMap = new Map(walks.map(w => [w.id, w.text]))
      const execPrompt = buildExecSummaryPrompt(clusters, walkMap)
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
          clusters = clusters.map(c => ({
            ...c,
            execSummary: typeof summaryMap.get(c.id) === 'string'
              ? summaryMap.get(c.id).slice(0, 600)
              : null,
          }))
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
      Promise.all([
        kv(kvBase, kvToken, 'POST', `incrby/insights:budget:${today}/${costCents}`),
        kv(kvBase, kvToken, 'POST', `expire/insights:budget:${today}/172800`),
      ]).catch(e => console.error('[insights] budget update error:', e.message))
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
        const text = (walkMap.get(id) ?? '').slice(0, 1500)
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
