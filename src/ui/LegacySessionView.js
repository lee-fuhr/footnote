import { getSessionLines } from '../db/index.js'
import { getLineLocation } from '../gps/index.js'
import { addLine } from '../session/manager.js'
import { logger } from '../logger.js'

const PIN_SVG = `<svg width="10" height="13" viewBox="0 0 10 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5z" fill="currentColor"/>
  <circle cx="5" cy="5" r="1.8" fill="var(--bg)"/>
</svg>`

const ICON_RETURN = `<svg width="12" height="11" viewBox="0 0 12 11" fill="none" aria-hidden="true" style="display:inline-block;vertical-align:middle;margin-right:6px;opacity:.65"><path d="M10 1.5v3a1 1 0 0 1-1 1H2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 4 2.5 6.5 5 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_MIC   = `<svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true" style="display:inline-block;vertical-align:middle;margin-right:6px;opacity:.65"><rect x="3" y="0.5" width="5" height="7" rx="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M1 7.5a4.5 4.5 0 0 0 9 0" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="5.5" y1="12" x2="5.5" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
const ICON_LOC   = `<svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" style="display:inline-block;vertical-align:middle;margin-right:6px;opacity:.65"><path d="M5 .5C2.8.5 1 2.4 1 4.6c0 3.2 4 7.4 4 7.4s4-4.2 4-7.4C9 2.4 7.2.5 5 .5z" stroke="currentColor" stroke-width="1.2"/><circle cx="5" cy="4.6" r="1.4" stroke="currentColor" stroke-width="1.1"/></svg>`

/**
 * Renders the legacy (line-based) walk UI into `container`.
 * Returns an object with methods for the outer Editor to call.
 *
 * @param {HTMLElement} container - The full editor container (not just canvas-body).
 * @param {object} opts
 * @param {HTMLElement} opts.canvasBody - The scrollable notes area.
 * @param {HTMLElement} opts.emptySteps - The .canvas-empty-steps element to rewrite.
 * @param {HTMLElement} opts.textarea - The shared text input element.
 * @param {Function} opts.onLineAdded - Callback fired after each line is saved.
 * @param {string} opts.voiceLabel - Platform-specific label ('Siri', 'Google', etc.)
 */
export function LegacySessionView(container, { canvasBody, emptySteps, textarea, onLineAdded, voiceLabel }) {
  // Rewrite empty-state steps for legacy mode
  emptySteps.innerHTML = `
    <p>${ICON_RETURN} Type a thought and press return</p>
    <p>${ICON_MIC} or speak it with ${voiceLabel}</p>
    <p>${ICON_LOC} every note saves your location automatically</p>
  `

  // ── Para-info sheet ──────────────────────────────────────────────────────── //

  const sheet       = container.querySelector('.para-info-sheet')
  const sheetScrim  = container.querySelector('.para-info-sheet-scrim')
  const sheetTime   = container.querySelector('.para-info-sheet-time')
  const sheetCoords = container.querySelector('.para-info-sheet-coords')
  const sheetAcc    = container.querySelector('.para-info-sheet-accuracy')
  const sheetPreview= container.querySelector('.para-info-sheet-preview')
  const sheetClose  = container.querySelector('.para-info-sheet-close')

  function formatTime(epochMs) {
    return new Date(epochMs).toLocaleTimeString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  }

  function openInfoSheet(line) {
    sheetTime.textContent = `Written at ${formatTime(line.createdAt)}`
    if (line.locationStatus === 'live' && line.location) {
      const { lat, lng, accuracy } = line.location
      sheetCoords.textContent = `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(5)}°${lng >= 0 ? 'E' : 'W'}`
      sheetAcc.textContent    = accuracy ? `±${accuracy}m accuracy` : ''
    } else if (line.locationStatus === 'stale') {
      sheetCoords.textContent = 'GPS signal lost'
      sheetAcc.textContent    = 'Last known position used'
    } else {
      sheetCoords.textContent = 'No GPS data'
      sheetAcc.textContent    = 'Location unavailable when written'
    }
    sheetPreview.textContent = line.text
    sheet.classList.add('open')
    sheetScrim.classList.add('open')
    sheetClose.focus()
  }

  function closeInfoSheet() {
    sheet.classList.remove('open')
    sheetScrim.classList.remove('open')
  }

  sheetClose.addEventListener('click', closeInfoSheet)
  sheetScrim.addEventListener('click', closeInfoSheet)

  // ── Rendering ──────────────────────────────────────────────────────────── //

  let _isFirst = true
  let _noteCount = 0

  function sepText(line) {
    const t = new Date(line.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (line.locationStatus === 'live' && line.location) {
      const { lat } = line.location
      return `${t} · ${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`
    }
    if (line.locationStatus === 'stale') return `${t} · last known`
    return t
  }

  function renderLine(line, animate = false) {
    if (!_isFirst) {
      const sep = document.createElement('div')
      sep.className = 'para-sep'
      sep.setAttribute('aria-hidden', 'true')
      sep.innerHTML = `
        <div class="para-sep-rule"></div>
        <span class="para-sep-text">${sepText(line)}</span>
        <div class="para-sep-rule"></div>
      `
      canvasBody.appendChild(sep)
    }
    _isFirst = false

    const wrap = document.createElement('div')
    wrap.className = 'para-wrap'
    if (animate) wrap.style.animationName = 'para-in'

    const pinBtn = document.createElement('button')
    pinBtn.className = 'para-info-btn'
    pinBtn.setAttribute('aria-label', 'Show location info for this paragraph')
    pinBtn.innerHTML = PIN_SVG
    pinBtn.style.color = 'var(--tan)'
    pinBtn.addEventListener('click', () => openInfoSheet(line))

    const p = document.createElement('p')
    p.className = 'para-text'
    p.textContent = line.text

    wrap.appendChild(pinBtn)
    wrap.appendChild(p)
    canvasBody.appendChild(wrap)
    canvasBody.scrollTop = canvasBody.scrollHeight
  }

  // ── Public API ──────────────────────────────────────────────────────────── //

  /** Load existing lines for a resumed/started session. */
  async function loadLines(sessionId) {
    const existing = await getSessionLines(sessionId)
    _noteCount = existing.length
    _isFirst = true
    existing.forEach(line => renderLine(line))
    return _noteCount
  }

  /** Clear rendered lines (called on session end). */
  function clearLines(canvasBodyEl) {
    Array.from((canvasBodyEl || canvasBody).children).forEach(el => {
      if (!el.classList.contains('canvas-empty')) el.remove()
    })
    _noteCount = 0
    _isFirst = true
  }

  /** Save the current textarea value as a new line. Returns the saved line or null. */
  async function saveLine(sessionId) {
    const text = textarea.value.trim()
    if (!text) return null
    try {
      const { location, locationStatus } = getLineLocation()
      const line = await addLine(text, location, locationStatus)
      textarea.value = ''
      textarea.style.height = 'auto'
      _noteCount++
      renderLine(line, true)
      onLineAdded?.(line)
      return line
    } catch (err) {
      logger.error('legacy-view', 'save_line_failed', { error: err.message })
      textarea.focus()
      return null
    }
  }

  function getNoteCount() { return _noteCount }

  return { loadLines, clearLines, saveLine, getNoteCount, renderLine }
}
