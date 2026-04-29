import { CHUNK_GAP_MS, interpolateLocation } from '../db/index.js'

function formatTime(epochMs) {
  return new Date(epochMs).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

function renderLocationText(line) {
  if (line.locationStatus === 'unavailable') return '[GPS unavailable]'
  if (line.locationStatus === 'stale') {
    const when = formatTime(line.location.capturedAt)
    return `[GPS stale from ${when}]`
  }
  const { lat, lng, accuracy } = line.location
  return `[${lat.toFixed(4)}, ${lng.toFixed(4)} ±${accuracy}m]`
}

function renderChunksText(chunks, anchors = []) {
  if (chunks.length === 0) return ''
  const blocks = []
  let current = { header: formatTime(chunks[0].timestamp), text: chunks[0].text }
  for (let i = 1; i < chunks.length; i++) {
    const prev = chunks[i - 1]
    const chunk = chunks[i]
    const gap = chunk.timestamp - prev.timestamp
    const hasLoc = chunk.location ?? interpolateLocation(chunk.timestamp, anchors)
    if (gap >= CHUNK_GAP_MS || hasLoc) {
      blocks.push(`${current.header}\n${current.text}`)
      current = { header: formatTime(chunk.timestamp), text: chunk.text }
    } else {
      current.text += chunk.text
    }
  }
  blocks.push(`${current.header}\n${current.text}`)
  return blocks.join('\n\n')
}

/** Pure function — converts a session + its lines to plain text string. */
export function sessionToText(session, lines) {
  const header = `Walk session — ${new Date(session.startedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`
  // Walk-mode: body is array of chunks → render with timestamp markers
  // Legacy: body is null → fall through to lines
  if (Array.isArray(session.body)) {
    return [header, renderChunksText(session.body, session.locationAnchors ?? [])].join('\n')
  }
  const body = lines.map(line =>
    `${formatTime(line.createdAt)} ${renderLocationText(line)}  ${line.text}`
  )
  return [header, ...body].join('\n')
}
