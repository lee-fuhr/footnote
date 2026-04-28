import { getLocationStatus } from '../gps/staleness.js'

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

  // Flat-doc sessions: body is the single text block; skip per-line mapping
  let body
  if (session.body !== null && session.body !== undefined) {
    body = session.body ? [session.body] : []
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
