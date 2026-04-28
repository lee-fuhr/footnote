import { describe, it, expect } from 'vitest'
import { sessionToMarkdown } from '../src/export/markdown.js'

const baseSession = {
  id: 'sess-1',
  startedAt: new Date('2026-04-23T09:14:00Z').getTime(),
  endedAt: new Date('2026-04-23T10:02:00Z').getTime(),
  lineCount: 3,
}

const lines = [
  {
    id: 'l1',
    sessionId: 'sess-1',
    createdAt: new Date('2026-04-23T09:14:00Z').getTime(),
    text: 'Called Marcus about the plan.',
    location: { lat: 40.758, lng: -73.985, accuracy: 8, capturedAt: new Date('2026-04-23T09:14:00Z').getTime() },
    locationStatus: 'live',
  },
  {
    id: 'l2',
    sessionId: 'sess-1',
    createdAt: new Date('2026-04-23T09:22:00Z').getTime(),
    text: 'The pricing model is wrong.',
    location: { lat: 40.758, lng: -73.985, accuracy: 12, capturedAt: new Date('2026-04-23T09:14:00Z').getTime() },
    locationStatus: 'stale',
  },
  {
    id: 'l3',
    sessionId: 'sess-1',
    createdAt: new Date('2026-04-23T09:31:00Z').getTime(),
    text: 'Buy milk on the way home.',
    location: null,
    locationStatus: 'unavailable',
  },
]

describe('sessionToMarkdown', () => {
  it('includes session header with dates', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).toContain('# Walk ·')
    expect(md).toContain('2026')
  })

  it('includes all line texts', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).toContain('Called Marcus about the plan.')
    expect(md).toContain('The pricing model is wrong.')
    expect(md).toContain('Buy milk on the way home.')
  })

  it('live location shows lat/lng and accuracy', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).toContain('40.758')
    expect(md).toContain('73.985')
    expect(md).toContain('8m')
  })

  it('stale location shows "GPS last seen" not current coords', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).toContain('GPS last seen')
  })

  it('unavailable location shows "GPS unavailable"', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).toContain('GPS unavailable')
  })

  it('includes export footer', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).toContain('Footnote')
  })

  it('does not tally a note count in the header', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).not.toMatch(/\*\*Notes:\*\*/)
  })

  it('does not include any alpha-walker brand tag', () => {
    const md = sessionToMarkdown(baseSession, lines)
    expect(md).not.toMatch(/alpha walker/i)
    expect(md).not.toMatch(/founder/i)
  })

  it('empty lines array → still generates valid markdown', () => {
    const md = sessionToMarkdown(baseSession, [])
    expect(md).toContain('# Walk ·')
    expect(typeof md).toBe('string')
  })

  it('active session (no endedAt) → duration shows as ongoing', () => {
    const active = { ...baseSession, endedAt: null }
    const md = sessionToMarkdown(active, [])
    expect(md).toContain('ongoing')
  })
})
