import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { startAnchorPoller, stopAnchorPoller } from '../src/gps/index.js'

beforeEach(() => {
  vi.useFakeTimers()
  stopAnchorPoller()
})

afterEach(() => {
  stopAnchorPoller()
  vi.useRealTimers()
})

describe('GPS anchor poller', () => {
  it('calls callback every intervalMs when position is available', () => {
    const cb = vi.fn()
    const fakePos = { lat: 47.6, lng: -122.3, accuracy: 10, capturedAt: Date.now() }
    startAnchorPoller(cb, { intervalMs: 60000, positionFn: () => fakePos })

    vi.advanceTimersByTime(60000)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0]).toMatchObject({ lat: 47.6, lng: -122.3, accuracy: 10 })
    expect(cb.mock.calls[0][0].timestamp).toBeTypeOf('number')

    vi.advanceTimersByTime(60000)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('does not call callback when no position is available', () => {
    const cb = vi.fn()
    startAnchorPoller(cb, { intervalMs: 60000, positionFn: () => null })
    vi.advanceTimersByTime(180000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('stopAnchorPoller stops future callbacks', () => {
    const cb = vi.fn()
    const fakePos = { lat: 47.6, lng: -122.3, accuracy: 10, capturedAt: Date.now() }
    startAnchorPoller(cb, { intervalMs: 60000, positionFn: () => fakePos })
    vi.advanceTimersByTime(60000)
    expect(cb).toHaveBeenCalledTimes(1)

    stopAnchorPoller()
    vi.advanceTimersByTime(120000)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('starting a second poller replaces the first', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const fakePos = { lat: 47.6, lng: -122.3, accuracy: 10, capturedAt: Date.now() }
    startAnchorPoller(cb1, { intervalMs: 60000, positionFn: () => fakePos })
    startAnchorPoller(cb2, { intervalMs: 60000, positionFn: () => fakePos })
    vi.advanceTimersByTime(60000)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).toHaveBeenCalledTimes(1)
  })
})
