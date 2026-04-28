import { getAllSessions, getSessionLines, deleteSession } from '../db/index.js'
import { shareSessionAsMarkdown, shareSessionAsText } from '../export/share.js'
import { confirmSheet } from './ConfirmSheet.js'
import { codaSheet } from './CodaSheet.js'
import { flatCodaSheet } from './FlatCodaSheet.js'
import { isCoded } from '../session/coded.js'
import { isSessionStarred } from '../session/starred.js'
import { ideaSheet } from './IdeaSheet.js'

function formatDate(epochMs) {
  return new Date(epochMs).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(epochMs) {
  return new Date(epochMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(startMs, endMs) {
  if (!endMs) return 'ongoing'
  const mins = Math.round((endMs - startMs) / 60000)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function SessionList(container, { onSessionSelect } = {}) {
  const heading = document.createElement('p')
  heading.className = 'session-list-heading'
  heading.textContent = 'Past walks'
  container.appendChild(heading)

  const el = document.createElement('div')
  el.className = 'session-list'
  container.appendChild(el)

  const ideaBtn = document.createElement('button')
  ideaBtn.className = 'session-list-idea-btn'
  ideaBtn.textContent = 'Got an idea? →'
  ideaBtn.addEventListener('click', () => ideaSheet())
  container.appendChild(ideaBtn)

  async function render() {
    const sessions = await getAllSessions()

    container.hidden = sessions.length === 0

    el.innerHTML = sessions.length === 0
      ? ''
      : sessions.map(s => `
          <div class="session-card" data-id="${s.id}">
            <div class="session-card-left">
              <span class="session-date">${formatDate(s.startedAt)}</span>
              <span class="session-meta">${formatTime(s.startedAt)} · ${formatDuration(s.startedAt, s.endedAt)}</span>
            </div>
            <div class="session-card-actions">
              ${isSessionStarred(s.id) ? `<span class="session-star" aria-label="Starred walk">&#9733;</span>` : ''}
              ${s.body !== null && s.body && !isCoded(s.id) ? `<button class="btn-flat-coda" data-id="${s.id}" title="Review walk">&#9733; Review</button>` : ''}
              ${s.body === null && s.lineCount > 0 && !isCoded(s.id) ? `<button class="btn-coda" data-id="${s.id}" title="Review with Coda">&#9733; Review</button>` : ''}
              <button class="btn-export-md" data-id="${s.id}" title="Export as Markdown">.md</button>
              <button class="btn-export-txt" data-id="${s.id}" title="Export as plain text">.txt</button>
              <button class="btn-delete" data-id="${s.id}">delete</button>
            </div>
          </div>
        `).join('')

    el.querySelectorAll('.session-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return
        onSessionSelect?.(card.dataset.id)
      })
    })

    el.querySelectorAll('.btn-flat-coda').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const session = sessions.find(s => s.id === btn.dataset.id)
        if (session) flatCodaSheet(session)
        document.addEventListener('footnote:coda-complete', () => render(), { once: true })
      })
    })

    el.querySelectorAll('.btn-coda').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        codaSheet(btn.dataset.id)
        document.addEventListener('footnote:coda-complete', () => render(), { once: true })
      })
    })

    el.querySelectorAll('.btn-export-md').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const id = btn.dataset.id
        const session = sessions.find(s => s.id === id)
        const lines = await getSessionLines(id)
        await shareSessionAsMarkdown(session, lines)
      })
    })

    el.querySelectorAll('.btn-export-txt').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const id = btn.dataset.id
        const session = sessions.find(s => s.id === id)
        const lines = await getSessionLines(id)
        await shareSessionAsText(session, lines)
      })
    })

    el.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation()
        const ok = await confirmSheet('Delete this walk? This can’t be undone.', {
          okLabel: 'delete',
          cancelLabel: 'keep it',
          danger: true,
        })
        if (!ok) return
        await deleteSession(btn.dataset.id)
        await render()
      })
    })
  }

  return { render }
}
