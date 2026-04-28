import { describe, it, expect } from 'vitest'
import { sessionToText } from '../src/export/text.js'

const session = {
  id: 'sess-1',
  startedAt: new Date('2026-04-23T09:14:00Z').getTime(),
  endedAt: new Date('2026-04-23T10:02:00Z').getTime(),
  lineCount: 2,
}

const lines = [
  {
    id: 'l1',
    createdAt: new Date('2026-04-23T09:14:00Z').getTime(),
    text: 'First thought.',
    location: { lat: 40.758, lng: -73.985, accuracy: 8, capturedAt: Date.now() },
    locationStatus: 'live',
  },
  {
    id: 'l2',
    createdAt: new Date('2026-04-23T09:22:00Z').getTime(),
    text: 'Second thought.',
    location: null,
    locationStatus: 'unavailable',
  },
]

describe('sessionToText', () => {
  it('returns a string', () => {
    expect(typeof sessionToText(session, lines)).toBe('string')
  })

  it('includes all line texts', () => {
    const txt = sessionToText(session, lines)
    expect(txt).toContain('First thought.')
    expect(txt).toContain('Second thought.')
  })

  it('live location shows coordinates', () => {
    const txt = sessionToText(session, lines)
    expect(txt).toContain('40.758')
  })

  it('unavailable location shows GPS unavailable marker', () => {
    const txt = sessionToText(session, lines)
    expect(txt).toContain('GPS unavailable')
  })

  it('each line is on its own line', () => {
    const txt = sessionToText(session, lines)
    const lineCount = txt.split('\n').filter(l => l.includes('thought')).length
    expect(lineCount).toBe(2)
  })

  it('does not include any alpha-walker brand tag', () => {
    const txt = sessionToText(session, lines)
    expect(txt).not.toMatch(/alpha walker/i)
    expect(txt).not.toMatch(/founder/i)
  })
})
