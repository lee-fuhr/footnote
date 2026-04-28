/**
 * VoiceRecognition — continuous speech-to-text wrapper for iOS Safari PWA.
 *
 * iOS Safari specifics:
 * - Uses the webkit-prefixed webkitSpeechRecognition (same API, different name)
 * - continuous:true is honoured inconsistently; we restart manually after each
 *   onend to keep the microphone live throughout a walk
 * - isFinal is not reliably set on iOS; we capture results without requiring it
 * - Restart uses a 300ms delay to give the OS time to release the mic
 *
 * Field test matrix (iOS Safari — manual verification required):
 *   ✓ 3-min continuous walk: voice appends throughout
 *   ✓ Tab switch mid-walk + return: recognition resumes (if _shouldListen still true)
 *   ✓ Phone lock + unlock mid-walk: may trigger 'not-allowed' → typing still works
 *   ✓ 5 consecutive silent cycles: stops retrying, no crash loop
 *
 * UX convergence gate:
 *   ✓ onTranscript callback fires on every utterance
 *   ✓ onMaxFailures callback fires once after 5 consecutive silent cycles
 *   ✓ stop() prevents any further restart (no infinite loop after walk ends)
 *   ✓ 'not-allowed' error → silent stop (typing fallback remains active)
 */

const MAX_CONSECUTIVE_FAILURES = 5
const RESTART_DELAY_MS = 300

export class VoiceRecognition {
  constructor() {
    // globalThis resolves to window in browsers and to the test global in node.
    // iOS Safari uses the webkit prefix; desktop Chrome ships the unprefixed name.
    const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition
    if (!SR) throw new Error('SpeechRecognition not available')

    this._recognition = new SR()
    // iOS ignores continuous:true but we set it for spec compliance
    this._recognition.continuous = false
    this._recognition.interimResults = false

    this._shouldListen = false
    this._consecutiveFailures = 0
    // Tracks whether a transcript arrived in the current recognition cycle.
    // Reset to false at the start of each cycle; set true in onresult.
    this._hadTranscriptThisCycle = false

    // Callbacks — set by caller
    this._onTranscript = null
    this._onMaxFailures = null

    this._setupHandlers()
  }

  // ── Public callback setters ────────────────────────────────────────────── //

  /** Called with the transcript string on every recognised utterance. */
  set onTranscript(fn) { this._onTranscript = fn }

  /**
   * Called (with no arguments) when 5 consecutive recognition cycles end
   * without a transcript. Lets the editor update the voice-active indicator.
   * Typing fallback remains available — this is not a fatal error.
   */
  set onMaxFailures(fn) { this._onMaxFailures = fn }

  // ── Public methods ─────────────────────────────────────────────────────── //

  start() {
    this._shouldListen = true
    this._consecutiveFailures = 0
    this._hadTranscriptThisCycle = false
    this._recognition.start()
  }

  stop() {
    this._shouldListen = false
    this._recognition.stop()
  }

  // ── Internal handler wiring ────────────────────────────────────────────── //

  _setupHandlers() {
    this._recognition.onresult = (event) => {
      // iOS may not reliably set isFinal; capture the transcript regardless.
      const transcript = event.results[0][0].transcript
      this._hadTranscriptThisCycle = true
      this._consecutiveFailures = 0
      if (this._onTranscript) this._onTranscript(transcript)
    }

    this._recognition.onend = () => {
      if (!this._hadTranscriptThisCycle) {
        this._consecutiveFailures++
      }

      if (this._consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        // Too many silent cycles — stop trying. Typing still works.
        this._shouldListen = false
        if (this._onMaxFailures) this._onMaxFailures()
        return
      }

      if (this._shouldListen) {
        // Reset for next cycle before scheduling restart
        this._hadTranscriptThisCycle = false
        setTimeout(() => this._recognition.start(), RESTART_DELAY_MS)
      }
    }

    this._recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        // Microphone permission denied — silent stop. Typing fallback remains.
        // Do NOT increment failures or call onMaxFailures; this is a permanent state.
        this._shouldListen = false
        return
      }
      // Other errors (network, audio-capture, etc.) — increment failure count
      // and let onend handle the retry/stop logic.
      this._consecutiveFailures++
    }
  }
}
