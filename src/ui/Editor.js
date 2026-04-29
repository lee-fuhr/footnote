import { startSession, endSession, getState, getCurrentSessionId } from '../session/manager.js'
import { appendChunk, flushChunk, setChunkTimer, chunkBodyText, getAllSessions } from '../db/index.js'
import { hasFolder, requestFolder, autoExport } from '../export/icloud.js'
import { flatCodaSheet } from './FlatCodaSheet.js'
import { getLineLocation } from '../gps/index.js'
import { GpsIndicator } from './GpsIndicator.js'
import { confirmSheet } from './ConfirmSheet.js'
import { codaSheet } from './CodaSheet.js'
import { LegacySessionView } from './LegacySessionView.js'
import { logger } from '../logger.js'
import { VoiceRecognition } from '../voice/recognition.js'

const ACTIVE = 'ACTIVE'
const DRAFT_KEY = 'footnote_draft'

const HEADLINES = [
  'What are you thinking?',
  'Where did that thought go?',
  'Capture it before it disappears.',
  "What's on your mind?",
  'Keep walking. Keep thinking.',
  'Your next idea is out there.',
  'Think out loud.',
  'What keeps coming back to you?',
  'Start typing. The walk does the rest.',
  'Ready when you are.',
]
function pickHeadline() {
  return HEADLINES[Math.floor(Math.random() * HEADLINES.length)]
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 14 14" fill="none" aria-hidden="true" class="logo-mark">
  <path fill="#8B6F47" d="M11.9099 13.3852C13.468 12.9364 13.7277 11.2694 12.3644 9.85887L9.89729 7.10274C9.79687 5.61865 9.42688 2.90237 8.60722 2.71002C7.78756 2.51768 6.442 3.79732 5.9049 3.35117C5.3678 2.90503 5.71014 1.90858 5.71014 1.52389C5.71014 1.1392 4.47668 0.498047 4.47668 0.498047C3.08919 1.22169 1.53298 3.61452 0.863386 5.16927C0.615782 5.74419 0.79742 6.38044 1.2215 6.84087C3.15256 8.93748 5.09835 11 7.21708 12.9235C7.59579 13.2673 8.09311 13.4518 8.60722 13.4687L8.67724 13.471C9.83907 13.5093 10.6712 13.5367 11.9099 13.3852Z"/>
  <path fill="#1C1814" fill-rule="evenodd" d="M4.47682 0.498047L4.70743 0.0544018C4.56266 -0.0208504 4.39027 -0.0207316 4.24561 0.0547201C3.4461 0.471702 2.65435 1.32909 1.99747 2.22672C1.33051 3.1381 0.754872 4.15751 0.404306 4.9715C0.0604182 5.76998 0.330432 6.61131 0.853862 7.17961C2.78633 9.27774 4.74481 11.3542 6.88114 13.2937C7.35592 13.7247 7.96992 13.948 8.59092 13.9684L8.66879 13.971C9.82808 14.0092 10.6933 14.0378 11.9708 13.8815C11.997 13.8783 12.023 13.873 12.0485 13.8657C12.9939 13.5933 13.6087 12.9192 13.7281 12.0508C13.8437 11.2103 13.4813 10.2981 12.7308 9.51845L10.3838 6.89644C10.3269 6.15415 10.209 5.1649 10.009 4.30828C9.90165 3.84852 9.76492 3.40159 9.58836 3.04631C9.4284 2.72444 9.16267 2.32675 8.72159 2.22325C8.37655 2.14228 8.02818 2.22404 7.75219 2.319C7.49712 2.40676 7.2344 2.5319 7.00817 2.63966L6.93589 2.67405C6.67467 2.798 6.47486 2.88727 6.31606 2.92741C6.25813 2.94206 6.22273 2.94586 6.20345 2.9464C6.13939 2.87629 6.09026 2.73346 6.10557 2.44059C6.11333 2.2922 6.13551 2.14052 6.1594 1.98478L6.16479 1.94992C6.1849 1.82 6.21029 1.65605 6.21029 1.52389C6.21029 1.34611 6.14129 1.20106 6.08212 1.10571C6.02025 1.00601 5.94269 0.918432 5.8689 0.845561C5.7212 0.699691 5.53787 0.563497 5.3735 0.452427C5.20563 0.338992 5.04001 0.240097 4.91773 0.170181C4.85619 0.134991 4.80467 0.106597 4.7681 0.0867769L4.72489 0.0635902L4.71272 0.0571676L4.70919 0.0553177L4.70808 0.0547418L4.7077 0.0545421L4.70755 0.0544645C4.70749 0.054432 4.70743 0.0544018 4.47682 0.498047ZM2.80446 2.81728C3.36056 2.05737 3.95083 1.42576 4.48364 1.07431C4.58195 1.13185 4.69853 1.20323 4.81361 1.28099C4.9576 1.3783 5.08264 1.47452 5.16621 1.55706C5.1823 1.57294 5.19497 1.58651 5.20481 1.5977C5.19876 1.65011 5.18762 1.72463 5.17097 1.83313C5.14746 1.98637 5.11763 2.18381 5.10693 2.38839C5.08699 2.77002 5.12231 3.35099 5.58556 3.73579C5.90902 4.00447 6.30053 3.9628 6.56115 3.89691C6.83132 3.82861 7.11982 3.69364 7.36459 3.57749L7.43192 3.5455C7.66875 3.4329 7.87926 3.33281 8.07753 3.26459C8.29441 3.18997 8.4206 3.18202 8.48712 3.19549C8.48671 3.19558 8.48671 3.19585 8.49021 3.19859C8.50686 3.21165 8.58383 3.27199 8.69285 3.49135C8.81933 3.74585 8.93506 4.10681 9.03521 4.53567C9.23425 5.38804 9.34933 6.40874 9.39857 7.13649C9.40609 7.24769 9.45055 7.35318 9.52488 7.43622L11.992 10.1923C12.6132 10.8356 12.8001 11.4592 12.7375 11.9146C12.6817 12.3201 12.4168 12.6847 11.8726 12.8728C9.82463 10.5771 7.3889 8.30451 5.07369 6.25179C3.82416 5.14392 2.73187 5.04157 1.30503 5.41158C1.64178 4.62629 2.17904 3.6719 2.80446 2.81728Z" clip-rule="evenodd"/>
</svg>`

function getVoiceLabel() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'Siri'
  if (/Android/.test(ua)) return 'Google'
  return 'voice-to-text'
}

/** Show a brief status toast in the empty-prompt area. */
function showToast(emptyState, emptyPrompt, message, duration = 3000) {
  emptyPrompt.textContent = message
  emptyState.hidden = false
  setTimeout(() => {
    emptyPrompt.textContent = 'What are you thinking?'
  }, duration)
}

export function Editor(container, { onLineAdded, onSessionEnd } = {}) {
  const voiceLabel = getVoiceLabel()
  const headline = pickHeadline()

  container.innerHTML = `
    <div class="canvas-header">
      <span class="canvas-wordmark">${LOGO_SVG}<span>Foot<em>note</em></span></span>
    </div>
    <div class="canvas-body" aria-live="polite" aria-label="Walk notes">
      <div class="journal-history"></div>
      <div class="canvas-empty">
        <p class="canvas-empty-prompt">${headline}</p>
        <p class="canvas-empty-tag">The thought that showed up at the corner.</p>
        <div class="canvas-empty-steps"></div>
        <a class="canvas-about-link link-philosophy" href="/about.html">About Footnote</a>
      </div>
    </div>
    <div class="canvas-input-wrap">
      <textarea class="canvas-input" placeholder="tap to start your walk" rows="2"
        aria-label="Walk note"
        autocorrect="off" autocapitalize="sentences" spellcheck="false"
        autocomplete="off" data-gramm="false" data-gramm_editor="false"
        data-enable-grammarly="false"></textarea>
    </div>
    <div class="canvas-footer">
      <span class="gps-indicator-slot"></span>
      <span class="gps-coords" aria-live="polite"></span>
      <span class="voice-indicator" aria-live="polite" aria-label="Voice recording active" hidden></span>
    </div>

    <div class="para-info-sheet-scrim"></div>
    <div class="para-info-sheet" role="dialog" aria-modal="true" aria-label="Paragraph location info">
      <div class="para-info-sheet-time"></div>
      <div class="para-info-sheet-coords"></div>
      <div class="para-info-sheet-accuracy"></div>
      <div class="para-info-sheet-preview"></div>
      <button class="para-info-sheet-close">close</button>
    </div>
  `

  const canvasBody  = container.querySelector('.canvas-body')
  const emptyState  = container.querySelector('.canvas-empty')
  const emptyPrompt = container.querySelector('.canvas-empty-prompt')
  const emptySteps  = container.querySelector('.canvas-empty-steps')
  const inputWrap   = container.querySelector('.canvas-input-wrap')
  const textarea    = container.querySelector('.canvas-input')
  const gpsSlot     = container.querySelector('.gps-indicator-slot')
  const gpsCoords   = container.querySelector('.gps-coords')

  const gpsIndicator = GpsIndicator(gpsSlot)

  let _gpsInterval = null
  let _opening     = false
  let _currentSession = null  // full session record

  // ── GPS footer ────────────────────────────────────────────────────────── //

  function startGpsRefresh() {
    _gpsInterval = setInterval(() => {
      gpsIndicator.update()
      updateCoords()
    }, 5000)
  }

  function stopGpsRefresh() {
    if (_gpsInterval) { clearInterval(_gpsInterval); _gpsInterval = null }
  }

  function updateCoords() {
    const { location, locationStatus } = getLineLocation()
    if (locationStatus === 'live' && location) {
      const { lat } = location
      gpsCoords.textContent = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`
    } else if (locationStatus === 'stale') {
      gpsCoords.textContent = 'GPS updating…'
    } else {
      gpsCoords.textContent = ''
    }
  }

  // ── Flat-doc (body !== null) UI ───────────────────────────────────────── //

  function mountFlatDoc(session) {
    _currentSession = session
    const sessionId = session.id

    // Restore saved content
    textarea.value = chunkBodyText(session.body)

    // Rewrite empty-state steps for flat-doc
    emptySteps.innerHTML = '<p>Start typing. Your walk saves as you go.</p>'

    // Show end-walk button in footer
    const footer = container.querySelector('.canvas-footer')
    let endBtn = footer.querySelector('.walk-end-btn')
    if (!endBtn) {
      endBtn = document.createElement('button')
      endBtn.className = 'walk-end-btn'
      endBtn.textContent = 'End walk'
      endBtn.style.cssText = 'min-height:56px;margin-left:auto;display:block;'
      footer.appendChild(endBtn)
    }

    // Voice-active indicator (pulsing dot in footer)
    const voiceIndicator = container.querySelector('.voice-indicator')

    // Show back navigation
    const header = container.querySelector('.canvas-header')
    let backBtn = header.querySelector('.walk-back-btn')
    if (!backBtn) {
      backBtn = document.createElement('button')
      backBtn.className = 'walk-back-btn'
      backBtn.setAttribute('aria-label', 'Back to session list')
      backBtn.textContent = '←'
      header.prepend(backBtn)
    }

    // Textarea: debounced save on input. At debounce fire, capture the current
    // GPS + Date.now() and pass them through to appendChunk so each chunk's
    // metadata reflects the moment it was written.
    function handleInput() {
      setChunkTimer(setTimeout(() => {
        const { location, locationStatus } = getLineLocation()
        appendChunk(sessionId, textarea.value, {
          timestamp: Date.now(),
          location: locationStatus === 'live' ? location : null,
        })
      }, 500))
    }

    // ── Voice recognition (flat-doc only) ──────────────────────────────── //

    let _voice = null

    // Only wire up voice if the browser supports SpeechRecognition.
    // iOS Safari uses webkitSpeechRecognition; missing = typing-only fallback.
    if (globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition) {
      try {
        _voice = new VoiceRecognition()

        _voice.onTranscript = (text) => {
          // Append voice text after a space, then trigger debounced save.
          // Auto-scroll only if the user is already near the bottom — don't
          // interrupt them if they're reading earlier text.
          const nearBottom =
            textarea.scrollTop + textarea.clientHeight >= textarea.scrollHeight - 40

          textarea.value += (textarea.value ? ' ' : '') + text
          setChunkTimer(setTimeout(() => {
            const { location, locationStatus } = getLineLocation()
            appendChunk(sessionId, textarea.value, {
              timestamp: Date.now(),
              location: locationStatus === 'live' ? location : null,
            })
          }, 500))

          if (nearBottom) {
            textarea.scrollTop = textarea.scrollHeight
          }
        }

        _voice.onMaxFailures = () => {
          // 5 silent cycles — stop retrying. Update indicator; typing still works.
          voiceIndicator.hidden = true
          voiceIndicator.classList.remove('voice-indicator--active')
          logger.info('editor', 'voice_max_failures', { sessionId })
        }

        _voice.start()
        voiceIndicator.hidden = false
        voiceIndicator.classList.add('voice-indicator--active')
      } catch (err) {
        // SpeechRecognition unavailable at runtime (e.g. permission denied at
        // construction, or API not truly available despite the global existing).
        // Fall through to typing-only mode silently.
        logger.info('editor', 'voice_unavailable', { reason: err.message })
        _voice = null
      }
    }

    // Walk-end handler
    async function handleEnd() {
      const ok = await confirmSheet('End this walk?', {
        okLabel: 'end walk',
        cancelLabel: 'keep going',
      })
      if (!ok) return

      // Stop voice before flush — prevents restart after stop()
      if (_voice) {
        _voice.stop()
        voiceIndicator.hidden = true
        voiceIndicator.classList.remove('voice-indicator--active')
        _voice = null
      }

      const { location: endLoc, locationStatus: endLocStatus } = getLineLocation()
      await flushChunk(sessionId, textarea.value, {
        timestamp: Date.now(),
        location: endLocStatus === 'live' ? endLoc : null,
      })
      await endSession()

      // Re-read to get the final chunk array for export
      const stored = (await getAllSessions()).find(s => s.id === sessionId)

      // iCloud auto-export — first walk opens the folder picker (walk-end
      // is a user gesture, so showDirectoryPicker is allowed). Subsequent
      // walks write silently. If the user cancels or permission lapses,
      // the walk is still saved locally.
      const sessionForExport = { ...session, body: stored?.body ?? [], endedAt: Date.now() }
      if (!(await hasFolder())) await requestFolder()
      const exportResult = await autoExport(sessionForExport)

      textarea.value = ''
      setActive(false)
      showToast(emptyState, emptyPrompt, exportResult.saved ? 'Walk saved to iCloud.' : 'Walk saved.')
      onSessionEnd?.()
      flatCodaSheet(sessionForExport)
    }

    textarea.addEventListener('input', handleInput)
    endBtn.addEventListener('click', handleEnd)

    // Inactivity prompt
    const _inactivityHandler = async () => {
      const ok = await confirmSheet('Still out there? Tap to keep going.', {
        okLabel: 'keep going',
        cancelLabel: 'end walk',
      })
      if (!ok) handleEnd()
    }
    document.addEventListener('footnote:inactivity-prompt', _inactivityHandler)
  }

  // ── Legacy (body === null) UI ─────────────────────────────────────────── //

  let _legacyView = null
  let _draftTimer = null

  function mountLegacy(session) {
    _currentSession = session

    _legacyView = LegacySessionView(container, {
      canvasBody,
      emptySteps,
      textarea,
      onLineAdded,
      voiceLabel,
    })

    // Draft persistence for legacy textarea
    const _savedDraft = localStorage.getItem(DRAFT_KEY)
    if (_savedDraft) textarea.value = _savedDraft

    // Key handler: Enter to save
    textarea.addEventListener('keydown', function legacyKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleLegacySave()
      }
    })
  }

  async function handleLegacyStart() {
    try {
      const session = await startSession()
      logger.info('editor', 'session_started', { sessionId: session.id })
      const noteCount = await _legacyView.loadLines(session.id)
      setActive(true)
      return { ok: true, session }
    } catch (err) {
      logger.error('editor', 'start_failed', { error: err.message })
      return { ok: false }
    }
  }

  async function handleLegacySave() {
    if (!textarea.value.trim()) return

    if (getState() !== ACTIVE) {
      if (_opening) return
      _opening = true
      const { ok } = await handleLegacyStart()
      _opening = false
      if (!ok) return
    }

    const line = await _legacyView.saveLine(getCurrentSessionId())
    if (line) {
      localStorage.removeItem(DRAFT_KEY)
      gpsIndicator.update()
      updateCoords()
    }
  }

  async function handleLegacyEnd() {
    const ok = await confirmSheet('End this walk?', {
      okLabel: 'end walk',
      cancelLabel: 'keep going',
    })
    if (!ok) return
    const noteCount = _legacyView.getNoteCount()
    const sessionId = getCurrentSessionId()
    await endSession()
    setActive(false)
    _legacyView.clearLines(canvasBody)
    if (noteCount > 0) {
      showToast(emptyState, emptyPrompt, 'Saved.')
    } else {
      emptyState.hidden = false
    }
    onSessionEnd?.()
    if (noteCount > 0 && sessionId) codaSheet(sessionId)
  }

  // ── Shared active-state toggle ────────────────────────────────────────── //

  function setActive(active) {
    emptyState.hidden = active
    textarea.placeholder = active ? '…continue' : 'tap to start your walk'
    if (active) {
      startGpsRefresh()
      gpsIndicator.update()
      updateCoords()
      textarea.focus()
    } else {
      stopGpsRefresh()
      textarea.style.height = 'auto'
    }
  }

  // ── Shared event setup ────────────────────────────────────────────────── //

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
    // Legacy draft persistence (flat-doc skips this via its own handler)
    if (_currentSession && _currentSession.body === null) {
      clearTimeout(_draftTimer)
      _draftTimer = setTimeout(() => localStorage.setItem(DRAFT_KEY, textarea.value), 500)
    }
  })

  canvasBody.addEventListener('click', e => {
    if (!e.target.closest('.para-wrap') && !e.target.closest('.para-info-btn')) {
      textarea.focus()
    }
  })

  textarea.addEventListener('focus', () => {
    emptyState.hidden = true
  })

  textarea.addEventListener('blur', () => {
    if (getState() !== ACTIVE && !textarea.value.trim()) {
      emptyState.hidden = false
    }
  })

  // Inactivity prompt for legacy path
  document.addEventListener('footnote:inactivity-prompt', async () => {
    if (_currentSession && _currentSession.body !== null) return  // flat-doc handles its own
    const ok = await confirmSheet('Still out there? Tap to keep going.', {
      okLabel: 'keep going',
      cancelLabel: 'end walk',
    })
    if (!ok) handleLegacyEnd()
  })

  // ── handleStart: entry point for new walks ────────────────────────────── //

  async function handleStart() {
    try {
      const session = await startSession()
      logger.info('editor', 'session_started', { sessionId: session.id })

      // Route on body: null = legacy, '' = flat-doc
      if (session.body === null) {
        mountLegacy(session)
        await _legacyView.loadLines(session.id)
      } else {
        mountFlatDoc(session)
      }
      setActive(true)
      return true
    } catch (err) {
      logger.error('editor', 'start_failed', { error: err.message })
      return false
    }
  }

  async function handleResume(session) {
    if (session.body !== null) {
      mountFlatDoc(session)
    } else {
      mountLegacy(session)
      await _legacyView.loadLines(session.id)
    }
    setActive(true)
  }

  return { handleStart, handleResume, setActive, canvasBody, journalHistory: container.querySelector('.journal-history') }
}
