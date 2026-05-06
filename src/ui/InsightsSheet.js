import { getMeta, storeMeta, getAllSessions, chunkBodyText } from '../db/index.js'
import { requestConsent } from './ConsentSheet.js'

let _el = null
let _touchStartX = 0
let _touchStartY = 0
const SWIPE_THRESHOLD = 80
const MAX_CHARS_PER_WALK = 8000
const ANALYZE_BTN_MAX_USES = 10
const EXCERPT_CHARS = 400

function _ensureEl() {
  if (_el) return _el

  // ── Swipe hint (fixed, bottom-right of screen) ────────────────────────── //
  const hint = document.createElement('div')
  hint.className = 'insights-hint'
  hint.setAttribute('aria-hidden', 'true')
  document.body.appendChild(hint)

  // ── Cluster list sheet ────────────────────────────────────────────────── //
  const sheet = document.createElement('div')
  sheet.className = 'insights-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Walk insights')
  sheet.innerHTML = `
    <div class="insights-header">
      <button class="insights-back-btn" aria-label="Back to walk">‹ walk</button>
      <span class="insights-title">Insights</span>
      <div class="insights-header-actions">
        <button class="insights-analyze-btn" aria-label="Analyze walks" title="Analyze now" hidden>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="insights-body">
      <div class="insights-empty" hidden>
        <p class="insights-empty-heading">Your walking thoughts,<br>organized.</p>
        <p class="insights-empty-sub">Keep walking — themes and patterns will appear here after a few walks.</p>
      </div>
      <div class="insights-loading" hidden>
        <p class="insights-loading-msg">Finding patterns…</p>
      </div>
      <div class="insights-error" hidden>
        <p class="insights-error-msg"></p>
        <button class="insights-retry-btn">try again</button>
      </div>
      <div class="insights-clusters" hidden></div>
      <div class="insights-footer" hidden>
        <span class="insights-last-analyzed"></span>
      </div>
    </div>
  `
  document.body.appendChild(sheet)

  // ── Cluster detail panel ──────────────────────────────────────────────── //
  const detail = document.createElement('div')
  detail.className = 'insights-detail'
  detail.setAttribute('role', 'dialog')
  detail.setAttribute('aria-modal', 'true')
  detail.setAttribute('aria-label', 'Cluster detail')
  detail.innerHTML = `
    <div class="insights-header">
      <button class="insights-detail-back-btn" aria-label="Back to insights">‹ insights</button>
      <span class="insights-title"></span>
      <div class="insights-header-actions"></div>
    </div>
    <div class="insights-detail-body"></div>
  `
  document.body.appendChild(detail)

  // ── Event wiring — list sheet ─────────────────────────────────────────── //
  const backBtn    = sheet.querySelector('.insights-back-btn')
  const analyzeBtn = sheet.querySelector('.insights-analyze-btn')
  const retryBtn   = sheet.querySelector('.insights-retry-btn')
  const clusters   = sheet.querySelector('.insights-clusters')

  backBtn.addEventListener('click', close)
  analyzeBtn.addEventListener('click', () => _runAnalysis(sheet))
  retryBtn.addEventListener('click', () => _runAnalysis(sheet))

  clusters.addEventListener('click', e => {
    const card = e.target.closest('.insights-cluster-card')
    if (card) _openDetail(card.dataset.id, detail)
  })

  _wireSwipeClose(sheet, () => close())

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (detail.classList.contains('open')) _closeDetail(detail)
      else if (sheet.classList.contains('open')) close()
    }
  })

  // ── Event wiring — detail panel ───────────────────────────────────────── //
  const detailBackBtn = detail.querySelector('.insights-detail-back-btn')
  detailBackBtn.addEventListener('click', () => _closeDetail(detail))
  _wireSwipeClose(detail, () => _closeDetail(detail))

  _el = { sheet, hint, analyzeBtn, detail }
  return _el
}

function _wireSwipeClose(el, onClose) {
  let startX = 0
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX }, { passive: true })
  el.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientX - startX > SWIPE_THRESHOLD) onClose()
  })
}

// ── Hint ──────────────────────────────────────────────────────────────────── //

async function _refreshHint(count) {
  const { hint } = _ensureEl()
  if (count >= 10) { hint.hidden = true; return }
  hint.hidden = false
  if (count < 3) {
    hint.innerHTML = 'Insights <span class="insights-hint-arrow">→</span>'
    hint.classList.add('has-label')
  } else {
    hint.innerHTML = '<span class="insights-hint-arrow">→</span>'
    hint.classList.remove('has-label')
  }
}

async function _refreshAnalyzeBtn() {
  const { analyzeBtn } = _ensureEl()
  const swipeCount = (await getMeta('insightSwipeCount')) ?? 0
  analyzeBtn.hidden = swipeCount >= ANALYZE_BTN_MAX_USES
}

// ── List view states ──────────────────────────────────────────────────────── //

function _setState(sheet, state) {
  sheet.querySelector('.insights-empty').hidden    = state !== 'empty'
  sheet.querySelector('.insights-loading').hidden  = state !== 'loading'
  sheet.querySelector('.insights-error').hidden    = state !== 'error'
  sheet.querySelector('.insights-clusters').hidden = state !== 'clusters'
  sheet.querySelector('.insights-footer').hidden   = state !== 'clusters'
}

function _renderClusters(sheet, clusters, processedAt) {
  const container = sheet.querySelector('.insights-clusters')
  container.innerHTML = clusters.map(c => `
    <div class="insights-cluster-card" data-id="${_esc(c.id)}" role="button" tabindex="0"
         aria-label="${_esc(c.name)}">
      <div class="insights-cluster-name">${_esc(c.name)}</div>
      <div class="insights-cluster-summary">${_esc(c.summary)}</div>
      <div class="insights-cluster-meta">${c.walkIds.length} walk${c.walkIds.length === 1 ? '' : 's'} ›</div>
    </div>
  `).join('')

  // Keyboard support for cards
  container.querySelectorAll('.insights-cluster-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        _openDetail(card.dataset.id, _ensureEl().detail)
      }
    })
  })

  const footer = sheet.querySelector('.insights-last-analyzed')
  footer.textContent = `Last analyzed ${_formatDate(processedAt)}`
  const hoursSince = (Date.now() - new Date(processedAt).getTime()) / 3_600_000
  footer.classList.toggle('insights-stale', hoursSince > 48)
}

// ── Detail panel ──────────────────────────────────────────────────────────── //

async function _openDetail(clusterId, detail) {
  const cached = await getMeta('walkInsights')
  const cluster = cached?.clusters?.find(c => c.id === clusterId)
  if (!cluster) return

  detail.querySelector('.insights-title').textContent = cluster.name

  const body = detail.querySelector('.insights-detail-body')
  body.innerHTML = `<p class="insights-detail-loading">Loading walks…</p>`
  detail.classList.add('open')

  // Fetch walks that belong to this cluster
  const allSessions = await getAllSessions()
  const walkMap = new Map(allSessions.map(s => [s.id, s]))
  const clusterWalks = cluster.walkIds
    .map(id => walkMap.get(id))
    .filter(s => s && s.endedAt && Array.isArray(s.body))
    .sort((a, b) => a.startedAt - b.startedAt)

  const summarySection = `
    <div class="insights-detail-summary">${_esc(cluster.summary)}</div>
    <div class="insights-detail-stat">${cluster.walkIds.length} walk${cluster.walkIds.length === 1 ? '' : 's'}</div>
  `

  const walkSections = clusterWalks.length > 0
    ? clusterWalks.map(s => {
        const text = chunkBodyText(s.body)
        const excerpt = text.slice(0, EXCERPT_CHARS).trimEnd()
        const truncated = text.length > EXCERPT_CHARS
        return `
          <div class="insights-detail-walk">
            <div class="insights-detail-walk-date">${_formatWalkDate(s.startedAt)}</div>
            <div class="insights-detail-walk-text">${_esc(excerpt)}${truncated ? '…' : ''}</div>
          </div>
        `
      }).join('')
    : '<p class="insights-detail-no-walks">Walk content not available.</p>'

  const futureSection = `
    <div class="insights-detail-future">
      <p class="insights-detail-future-label">Coming in AI Pack</p>
      <p class="insights-detail-future-desc">Executive summary, how this theme evolved over time, and synthesized key points from your entries.</p>
    </div>
  `

  body.innerHTML = summarySection + walkSections + futureSection
}

function _closeDetail(detail) {
  detail.classList.remove('open')
}

// ── Analysis flow ─────────────────────────────────────────────────────────── //

async function _loadAndShow(sheet) {
  const cached = await getMeta('walkInsights')
  if (cached?.clusters?.length) {
    _renderClusters(sheet, cached.clusters, cached.processedAt)
    _setState(sheet, 'clusters')
    return
  }

  const sessions = await getAllSessions()
  const completedWalks = sessions.filter(s =>
    s.endedAt && Array.isArray(s.body) && s.body.length > 0
  )

  if (completedWalks.length < 3) {
    const sub = sheet.querySelector('.insights-empty-sub')
    sub.textContent = completedWalks.length === 0
      ? 'Walk with Footnote — themes and patterns will appear after a few walks.'
      : `${completedWalks.length} of 3 walks needed. Keep going.`
    _setState(sheet, 'empty')
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const lastProcessed = await getMeta('walkInsightsProcessedDate')
  const consent = await getMeta('insightsConsentGiven')

  if (lastProcessed === today) {
    _setState(sheet, 'empty')
    return
  }

  if (!consent) {
    const agreed = await requestConsent()
    if (!agreed) { _setState(sheet, 'empty'); return }
  }

  await _runAnalysis(sheet)
}

async function _runAnalysis(sheet) {
  _setState(sheet, 'loading')

  const consent = await getMeta('insightsConsentGiven')
  if (!consent) {
    const agreed = await requestConsent()
    if (!agreed) {
      const cached = await getMeta('walkInsights')
      if (cached?.clusters?.length) {
        _renderClusters(sheet, cached.clusters, cached.processedAt)
        _setState(sheet, 'clusters')
      } else {
        _setState(sheet, 'empty')
      }
      return
    }
  }

  const sessions = await getAllSessions()
  const walks = sessions
    .filter(s => s.endedAt && Array.isArray(s.body) && s.body.length > 0)
    .map(s => ({
      id: s.id,
      text: chunkBodyText(s.body).slice(0, MAX_CHARS_PER_WALK),
    }))
    .filter(w => w.text.trim().length > 20)

  if (walks.length < 3) {
    _setState(sheet, 'empty')
    return
  }

  const insightsKey = import.meta.env.VITE_INSIGHTS_KEY ?? ''
  if (!insightsKey) {
    _showError(sheet, 'Insights not configured for this environment.')
    return
  }

  try {
    const resp = await fetch('/api/process-insights', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-insights-key': insightsKey,
      },
      body: JSON.stringify({
        walkIds: walks.map(w => w.id),
        walkBodies: walks.map(w => w.text),
      }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
      throw new Error(err.error ?? `HTTP ${resp.status}`)
    }

    const data = await resp.json()
    const today = new Date().toISOString().slice(0, 10)

    await Promise.all([
      storeMeta('walkInsights', { processedAt: data.processedAt, clusters: data.clusters }),
      storeMeta('walkInsightsProcessedDate', today),
      storeMeta('lastProcessedWalkId', walks[walks.length - 1].id),
    ])

    if (data.clusters.length === 0) {
      const sub = sheet.querySelector('.insights-empty-sub')
      sub.textContent = 'Not enough recurring themes yet — keep walking and writing.'
      _setState(sheet, 'empty')
      return
    }

    _renderClusters(sheet, data.clusters, data.processedAt)
    _setState(sheet, 'clusters')

  } catch (err) {
    console.error('[insights] analysis failed:', err.message)
    _showError(sheet, err.message === 'daily budget exceeded'
      ? 'Daily limit reached. Try again tomorrow.'
      : 'Couldn’t connect. Check your connection and try again.')
  }
}

function _showError(sheet, msg) {
  sheet.querySelector('.insights-error-msg').textContent = msg
  _setState(sheet, 'error')
}

// ── Public API ────────────────────────────────────────────────────────────── //

export function close() {
  if (!_el) return
  _el.sheet.classList.remove('open')
  if (_el.detail.classList.contains('open')) _closeDetail(_el.detail)
}

export async function initInsights(canvasBody) {
  const count = (await getMeta('insightSwipeCount')) ?? 0
  _ensureEl()
  await _refreshHint(count)

  canvasBody.addEventListener('touchstart', e => {
    _touchStartX = e.touches[0].clientX
    _touchStartY = e.touches[0].clientY
  }, { passive: true })

  canvasBody.addEventListener('touchend', async e => {
    const dx = e.changedTouches[0].clientX - _touchStartX
    const dy = Math.abs(e.changedTouches[0].clientY - _touchStartY)
    if (dx < -SWIPE_THRESHOLD && dy < Math.abs(dx)) {
      const newCount = ((await getMeta('insightSwipeCount')) ?? 0) + 1
      await storeMeta('insightSwipeCount', newCount)
      await _refreshHint(newCount)
      await _openSheet()
    }
  })
}

async function _openSheet() {
  const { sheet } = _ensureEl()
  sheet.classList.add('open')
  await _refreshAnalyzeBtn()
  await _loadAndShow(sheet)
}

// ── Helpers ───────────────────────────────────────────────────────────────── //

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function _formatDate(iso) {
  try {
    const d = new Date(iso)
    const diffH = (Date.now() - d) / 3_600_000
    if (diffH < 1) return 'just now'
    if (diffH < 24) return `${Math.floor(diffH)}h ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function _formatWalkDate(ts) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    })
  } catch { return '' }
}
