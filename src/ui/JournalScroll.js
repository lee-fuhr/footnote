import { getAllSessions, getSessionLines, deleteSession, chunkBodyText, interpolateLocation } from '../db/index.js'
import { shareSessionAsMarkdown, shareSessionAsText } from '../export/share.js'
import { confirmSheet } from './ConfirmSheet.js'
import { flatCodaSheet } from './FlatCodaSheet.js'

const RECENT_MS = 30 * 24 * 60 * 60 * 1000
const MAX_RECENT = 20

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(startMs, endMs) {
  if (!endMs) return 'ongoing'
  const mins = Math.round((endMs - startMs) / 60000)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function firstLoc(session) {
  if (Array.isArray(session.body) && session.body.length > 0) {
    const chunk = session.body[0]
    return chunk.location ?? interpolateLocation(chunk.timestamp, session.locationAnchors ?? [])
  }
  return null
}

function locStr(session) {
  const loc = firstLoc(session)
  if (!loc) return ''
  return ` · ${Math.abs(loc.lat).toFixed(2)}°${loc.lat >= 0 ? 'N' : 'S'}`
}

function autoTitle(session, text) {
  const snippet = (text || '').replace(/\s+/g, ' ').trim().slice(0, 55)
  return snippet
    ? `“${snippet}${(text || '').length > 55 ? '…' : ''}”`
    : formatDate(session.startedAt)
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function sessionText(session) {
  if (Array.isArray(session.body)) return chunkBodyText(session.body)
  if (session.lineCount > 0) {
    const lines = await getSessionLines(session.id)
    return lines.map(l => l.text).join('\n')
  }
  return ''
}

function buildWalkEl(session, text) {
  const date = formatDate(session.startedAt)
  const time = formatTime(session.startedAt)
  const dur  = formatDuration(session.startedAt, session.endedAt)
  const loc  = locStr(session)

  const el = document.createElement('div')
  el.className = 'walk-block'
  el.dataset.id = session.id
  el.innerHTML = `
    <div class="walk-rule">
      <span class="walk-rule-date">${date}</span>
      <span class="walk-rule-meta">${time} · ${dur}${loc}</span>
    </div>
    <div class="walk-body">${escHtml(text)}</div>
    <div class="walk-toolbar">
      <button class="btn-walk-review"  data-id="${session.id}">review ↗</button>
      <button class="btn-walk-md"      data-id="${session.id}">.md</button>
      <button class="btn-walk-txt"     data-id="${session.id}">.txt</button>
      <button class="btn-walk-delete"  data-id="${session.id}">delete</button>
    </div>
  `
  return el
}

function buildArchiveEl(sessions, sessionTexts) {
  const el = document.createElement('div')
  el.className = 'walk-archive'
  el.innerHTML = `<p class="walk-archive-label">Earlier walks</p>`
  const list = document.createElement('div')
  list.className = 'walk-archive-list'
  sessions.forEach((s, i) => {
    const item = document.createElement('div')
    item.className = 'walk-archive-item'
    item.dataset.id = s.id
    const date = formatDate(s.startedAt)
    const dur  = formatDuration(s.startedAt, s.endedAt)
    const loc  = locStr(s)
    item.innerHTML = `
      <span class="walk-archive-snippet">${escHtml(autoTitle(s, sessionTexts[i]))}</span>
      <span class="walk-archive-meta">${date} · ${dur}${loc}</span>
    `
    list.appendChild(item)
  })
  el.appendChild(list)
  return el
}

export function JournalScroll(historyEl, { canvasBody, onDelete } = {}) {
  let _sessions = []

  function wireButtons() {
    historyEl.querySelectorAll('.btn-walk-review').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const s = _sessions.find(s => s.id === btn.dataset.id)
        if (s) flatCodaSheet(s)
      })
    })

    historyEl.querySelectorAll('.btn-walk-md').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const s = _sessions.find(s => s.id === btn.dataset.id)
        const lines = await getSessionLines(btn.dataset.id)
        if (s) await shareSessionAsMarkdown(s, lines)
      })
    })

    historyEl.querySelectorAll('.btn-walk-txt').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const s = _sessions.find(s => s.id === btn.dataset.id)
        const lines = await getSessionLines(btn.dataset.id)
        if (s) await shareSessionAsText(s, lines)
      })
    })

    historyEl.querySelectorAll('.btn-walk-delete').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const ok = await confirmSheet('Delete this walk? This can’t be undone.', {
          okLabel: 'delete', cancelLabel: 'keep it', danger: true,
        })
        if (!ok) return
        await deleteSession(btn.dataset.id)
        onDelete?.()
        await render()
      })
    })

    historyEl.querySelectorAll('.walk-archive-item').forEach(item => {
      item.addEventListener('click', () => {
        const s = _sessions.find(s => s.id === item.dataset.id)
        if (s) flatCodaSheet(s)
      })
    })
  }

  async function render() {
    const all = await getAllSessions()
    const ended = all.filter(s => s.endedAt !== null).sort((a, b) => a.startedAt - b.startedAt)
    _sessions = ended

    const cutoff = Date.now() - RECENT_MS
    const archived = ended.filter(s => s.startedAt < cutoff)
    const recent   = ended.filter(s => s.startedAt >= cutoff).slice(-MAX_RECENT)

    historyEl.innerHTML = ''

    if (archived.length > 0) {
      const texts = await Promise.all(archived.map(sessionText))
      historyEl.appendChild(buildArchiveEl(archived, texts))
    }

    for (const s of recent) {
      const text = await sessionText(s)
      historyEl.appendChild(buildWalkEl(s, text))
    }

    wireButtons()

    if (canvasBody) {
      canvasBody.scrollTop = canvasBody.scrollHeight
    }
  }

  return { render }
}
