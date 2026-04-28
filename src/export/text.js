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

/** Pure function — converts a session + its lines to plain text string. */
export function sessionToText(session, lines) {
  const header = `Walk session — ${new Date(session.startedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`
  // Flat-doc sessions: body is the single text block; skip per-line mapping
  if (session.body !== null && session.body !== undefined) {
    return [header, session.body].join('\n')
  }
  const body = lines.map(line =>
    `${formatTime(line.createdAt)} ${renderLocationText(line)}  ${line.text}`
  )
  return [header, ...body].join('\n')
}
