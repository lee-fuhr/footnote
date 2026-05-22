import { getAllSessions, getSessionLines, deleteSession, chunkBodyText, interpolateLocation } from '../db/index.js'
import { shareSessionAsMarkdown, shareSessionAsText } from '../export/share.js'
import { confirmSheet } from './ConfirmSheet.js'
import { flatCodaSheet } from './FlatCodaSheet.js'
import { isSessionStarred, markSessionStarred } from '../session/starred.js'

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

function buildWalkEl(session, text, { justEnded = false } = {}) {
  const date = formatDate(session.startedAt)
  const time = formatTime(session.startedAt)
  const dur  = formatDuration(session.startedAt, session.endedAt)
  const loc  = locStr(session)
  const kept = isSessionStarred(session.id)

  const el = document.createElement('div')
  el.className = 'walk-block' + (kept ? ' walk-kept' : '')
  el.dataset.id = session.id

  // Kept walks carry a quiet inline star on the rule. No counts, no badge,
  // just a single calm mark in the brown/tan palette, consistent with the doc.
  const keptMark = kept
    ? '<span class="walk-kept-mark" aria-label="Kept" title="Kept">&#9733;</span>'
    : ''

  // The just-finished walk gets an inline Keep / Let it go row attached to its
  // own section, not a separate screen. Doing nothing keeps the walk; pruning
  // is optional. Keep stars the section in place; Let it go removes it.
  const coda = justEnded
    ? `
    <div class="walk-coda" role="group" aria-label="What to do with this walk">
      <span class="walk-coda-prompt">Kept. Let it go?</span>
      <button class="btn-walk-letgo" data-id="${session.id}">Let it go</button>
      <button class="btn-walk-keep"  data-id="${session.id}">&#9733; Keep</button>
    </div>`
    : ''

  el.innerHTML = `
    <div class="walk-rule">
      <span class="walk-rule-date">${keptMark}${date}</span>
      <span class="walk-rule-meta">${time} · ${dur}${loc}</span>
    </div>
    <div class="walk-body">${escHtml(text)}</div>${coda}
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

    // Inline Keep stars this walk's section in place and retires the coda row.
    // No screen, no navigation. Default (no tap) already keeps the walk, so this
    // just marks it and dismisses the prompt.
    historyEl.querySelectorAll('.btn-walk-keep').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const id = btn.dataset.id
        markSessionStarred(id)
        const block = historyEl.querySelector(`.walk-block[data-id="${id}"]`)
        if (block) {
          block.classList.add('walk-kept')
          const ruleDate = block.querySelector('.walk-rule-date')
          if (ruleDate && !block.querySelector('.walk-kept-mark')) {
            const mark = document.createElement('span')
            mark.className = 'walk-kept-mark'
            mark.setAttribute('aria-label', 'Kept')
            mark.setAttribute('title', 'Kept')
            mark.innerHTML = '&#9733;'
            ruleDate.prepend(mark)
          }
          block.querySelector('.walk-coda')?.remove()
        }
      })
    })

    // Inline Let it go removes this walk's section from the document.
    historyEl.querySelectorAll('.btn-walk-letgo').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        await deleteSession(btn.dataset.id)
        onDelete?.()
        await render()
      })
    })
  }

  async function render({ justEndedId = null } = {}) {
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

    let justEndedEl = null
    for (const s of recent) {
      const text = await sessionText(s)
      const justEnded = s.id === justEndedId
      const walkEl = buildWalkEl(s, text, { justEnded })
      historyEl.appendChild(walkEl)
      if (justEnded) justEndedEl = walkEl
    }

    wireButtons()

    // Land on the walk just finished if there is one; otherwise rest at the
    // bottom of the journal (the most recent walk).
    if (canvasBody) {
      if (justEndedEl) {
        justEndedEl.scrollIntoView({ block: 'start' })
      } else {
        canvasBody.scrollTop = canvasBody.scrollHeight
      }
    }
  }

  return { render }
}
