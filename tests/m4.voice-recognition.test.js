/**
 * M4 Voice Recognition tests — TDD red → green
 *
 * Tests VoiceRecognition (src/voice/recognition.js) in the node environment.
 * The SpeechRecognition mock is registered globally in tests/setup.js.
 *
 * Pattern for simulating utterances:
 *   mockInstance.onresult(buildResultEvent('text'))   → transcript received
 *   mockInstance.onend()                              → silence / cycle end
 *   mockInstance.onerror({ error: 'not-allowed' })   → permission denied
 *
 * Fake timers are used for the 300ms auto-restart delay so tests are
 * deterministic and instant.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MockSpeechRecognition, buildResultEvent } from './mocks/speechRecognition.js'
import { VoiceRecognition } from '../src/voice/recognition.js'

// ── Mock self-tests (verify the mock, not the SUT) ──────────────────────────

describe('MockSpeechRecognition — mock self-verification', () => {
  it('start() sets _running = true and increments startCallCount', () => {
    const mock = new MockSpeechRecognition()
    expect(mock._running).toBe(false)
    mock.start()
    expect(mock._running).toBe(true)
    expect(mock.startCallCount).toBe(1)
  })

  it('stop() sets _running = false', () => {
    const mock = new MockSpeechRecognition()
    mock.start()
    mock.stop()
    expect(mock._running).toBe(false)
  })

  it('can simulate a transcript by calling onresult directly', () => {
    const mock = new MockSpeechRecognition()
    let received = null
    mock.onresult = (event) => {
      received = event.results[0][0].transcript
    }
    mock.onresult(buildResultEvent('hello world'))
    expect(received).toBe('hello world')
  })

  it('can simulate silent failure by calling onend without preceding onresult', () => {
    const mock = new MockSpeechRecognition()
    let endFired = false
    mock.onend = () => { endFired = true }
    mock.onend()
    expect(endFired).toBe(true)
  })
})

// ── VoiceRecognition — core tests ────────────────────────────────────────────

describe('VoiceRecognition', () => {
  let voice
  let mockInstance

  beforeEach(() => {
    vi.useFakeTimers()
    voice = new VoiceRecognition()
    // Grab the internal mock instance that was created in the constructor
    mockInstance = voice._recognition
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Test 1: start() sets _shouldListen and calls recognition.start()
  it('start() sets _shouldListen = true and calls recognition.start()', () => {
    expect(voice._shouldListen).toBe(false)
    expect(mockInstance.startCallCount).toBe(0)

    voice.start()

    expect(voice._shouldListen).toBe(true)
    expect(mockInstance.startCallCount).toBe(1)
  })

  // Test 2: onend fires auto-restart after 300ms when _shouldListen is true
  it('onend triggers auto-restart after 300ms when _shouldListen === true', () => {
    voice.start()
    const callsAfterStart = mockInstance.startCallCount // = 1

    // Simulate recognition ending with a transcript this cycle (not a failure)
    mockInstance.onresult(buildResultEvent('some words'))
    mockInstance.onend()

    // Before 300ms: no second start yet
    expect(mockInstance.startCallCount).toBe(callsAfterStart)

    vi.advanceTimersByTime(300)

    // After 300ms: recognition.start() called again
    expect(mockInstance.startCallCount).toBe(callsAfterStart + 1)
  })

  // Test 3: onend does NOT restart when _shouldListen is false
  it('onend does NOT restart when _shouldListen === false', () => {
    voice.start()
    voice.stop()  // sets _shouldListen = false

    const callsAtStop = mockInstance.startCallCount

    mockInstance.onend()
    vi.advanceTimersByTime(300)

    expect(mockInstance.startCallCount).toBe(callsAtStop)
  })

  // Test 4: 5 consecutive onend-without-onresult sets _shouldListen = false
  it('5 consecutive silent onend cycles set _shouldListen = false and call onMaxFailures', () => {
    const onMaxFailures = vi.fn()
    voice.onMaxFailures = onMaxFailures

    voice.start()

    // Fire onend without onresult 4 times — should NOT stop yet
    for (let i = 0; i < 4; i++) {
      mockInstance.onend()
      vi.advanceTimersByTime(300)
    }
    expect(voice._shouldListen).toBe(true)
    expect(onMaxFailures).not.toHaveBeenCalled()

    // 5th silent onend — crosses the threshold
    mockInstance.onend()

    expect(voice._shouldListen).toBe(false)
    expect(onMaxFailures).toHaveBeenCalledTimes(1)

    // No further restart scheduled
    vi.advanceTimersByTime(300)
    // Total starts: 1 (initial) + 4 restarts = 5; no 6th after the 5th failure
    expect(mockInstance.startCallCount).toBe(5)
  })

  // Test 5: onresult fires onTranscript callback and resets _consecutiveFailures to 0
  it('onresult fires onTranscript callback and resets _consecutiveFailures to 0', () => {
    const onTranscript = vi.fn()
    voice.onTranscript = onTranscript

    voice.start()

    // Accumulate some failures first
    mockInstance.onend()
    vi.advanceTimersByTime(300)
    expect(voice._consecutiveFailures).toBe(1)

    // Now a transcript arrives
    mockInstance.onresult(buildResultEvent('captured text'))

    expect(onTranscript).toHaveBeenCalledWith('captured text')
    expect(voice._consecutiveFailures).toBe(0)
  })

  // Test: onerror with 'not-allowed' stops listening silently (typing still works)
  it("onerror 'not-allowed' sets _shouldListen = false without calling onMaxFailures", () => {
    const onMaxFailures = vi.fn()
    voice.onMaxFailures = onMaxFailures

    voice.start()
    mockInstance.onerror({ error: 'not-allowed' })

    expect(voice._shouldListen).toBe(false)
    // not-allowed is silent — no maxFailures callback
    expect(onMaxFailures).not.toHaveBeenCalled()
  })

  // Test: onerror with other errors increments _consecutiveFailures (let onend handle retry)
  it('onerror with non-permission error increments _consecutiveFailures', () => {
    voice.start()
    expect(voice._consecutiveFailures).toBe(0)

    mockInstance.onerror({ error: 'network' })

    expect(voice._consecutiveFailures).toBe(1)
  })

  // Test: _hadTranscriptThisCycle resets to false on each start()
  it('start() resets _hadTranscriptThisCycle and _consecutiveFailures', () => {
    voice.start()
    mockInstance.onresult(buildResultEvent('first'))  // _hadTranscriptThisCycle = true
    mockInstance.onend()                              // resets to false, restarts
    vi.advanceTimersByTime(300)                       // restart fires

    // After restart: _hadTranscriptThisCycle should be false (reset in onend before setTimeout)
    // and _consecutiveFailures should be 0 (reset because there WAS a transcript)
    expect(voice._consecutiveFailures).toBe(0)
    expect(voice._hadTranscriptThisCycle).toBe(false)
  })
})
