import { getLocationStatus } from '../gps/staleness.js'
import { CHUNK_GAP_MS, interpolateLocation } from '../db/index.js'

function formatDate(epochMs) {
  return new Date(epochMs).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(epochMs) {
  return new Date(epochMs).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

function formatDuration(startMs, endMs) {
  if (!endMs) return 'ongoing'
  const mins = Math.round((endMs - startMs) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function renderLocation(line) {
  if (line.locationStatus === 'unavailable') return '📍 _GPS unavailable_'
  if (line.locationStatus === 'stale') {
    const when = formatTime(line.location.capturedAt)
    return `📍 _GPS last seen at ${when}_`
  }
  const { lat, lng, accuracy } = line.location
  return `📍 ${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'} _(accuracy: ${accuracy}m)_`
}

function formatChunkHeader(chunk, anchors) {
  const time = formatTime(chunk.timestamp)
  const loc = chunk.location ?? interpolateLocation(chunk.timestamp, anchors)
  if (!loc) return `*${time}*`
  const { lat } = loc
  return `*${time} · ${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}*`
}

function renderChunks(chunks, anchors = []) {
  if (chunks.length === 0) return []
  const blocks = []
  let current = { header: formatChunkHeader(chunks[0], anchors), text: chunks[0].text }
  for (let i = 1; i < chunks.length; i++) {
    const prev = chunks[i - 1]
    const chunk = chunks[i]
    const gap = chunk.timestamp - prev.timestamp
    const hasLoc = chunk.location ?? interpolateLocation(chunk.timestamp, anchors)
    if (gap >= CHUNK_GAP_MS || hasLoc) {
      blocks.push(`${current.header}\n\n${current.text}`)
      current = { header: formatChunkHeader(chunk, anchors), text: chunk.text }
    } else {
      current.text += chunk.text
    }
  }
  blocks.push(`${current.header}\n\n${current.text}`)
  return blocks
}

/** Pure function — converts a session + its lines to Markdown string. */
export function sessionToMarkdown(session, lines) {
  const date = formatDate(session.startedAt)
  const start = formatTime(session.startedAt)
  const end = session.endedAt ? formatTime(session.endedAt) : null
  const duration = formatDuration(session.startedAt, session.endedAt)

  const header = [
    `# Walk · ${date}`,
    '',
    `**Started:** ${start}${end ? ` | **Ended:** ${end}` : ''} | **Duration:** ${duration}`,
    '',
    '---',
  ]

  // Walk-mode: body is array of chunks → render with timestamp/location headers
  // Legacy: body is null → fall through to lines store
  let body
  if (Array.isArray(session.body)) {
    body = renderChunks(session.body, session.locationAnchors ?? [])
  } else {
    body = lines.map(line => [
      `**${formatTime(line.createdAt)}** · ${renderLocation(line)}`,
      line.text,
    ].join('\n'))
  }

  const footer = [
    '---',
    `_Exported from Footnote on ${formatDate(Date.now())} at ${formatTime(Date.now())}_`,
  ]

  return [...header, ...body, ...footer].join('\n\n')
}
