/**
 * Mock SpeechRecognition for Vitest (node environment).
 *
 * Usage in tests:
 *   - Simulate transcript:   mockInstance.onresult(buildResultEvent('some text'))
 *   - Simulate silence/end:  mockInstance.onend()        (no preceding onresult)
 *   - Simulate error:        mockInstance.onerror({ error: 'not-allowed' })
 *
 * The mock tracks startCallCount so tests can assert on restart behaviour
 * without needing a separate spy.
 */
export class MockSpeechRecognition {
  constructor() {
    this.continuous = false
    this.interimResults = false
    this._running = false
    this.startCallCount = 0
    this.stopCallCount = 0
    // Handlers — recognition.js sets these; tests call them directly
    this.onresult = null
    this.onend = null
    this.onerror = null
  }

  start() {
    this._running = true
    this.startCallCount++
  }

  stop() {
    this._running = false
    this.stopCallCount++
  }
}

/**
 * Helper: build a minimal SpeechRecognitionEvent-shaped object.
 * Pass transcript text; isFinal defaults to true.
 */
export function buildResultEvent(transcript, isFinal = true) {
  return {
    results: [
      [{ transcript, confidence: 0.9 }],
    ],
  }
}
