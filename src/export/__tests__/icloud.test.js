import { describe, it, expect } from 'vitest'
import { journalToMarkdown } from '../icloud.js'

// The single-doc export: every walk concatenated into one flat markdown
// document. Same serializer feeds both the synced master journal and the
// manual Settings export, so they can never drift.
describe('journalToMarkdown — the whole flat document', () => {
  const A = { id: 'a', startedAt: new Date('2026-04-28T14:35:00').getTime(), endedAt: new Date('2026-04-28T15:00:00').getTime(), body: [{ text: 'First walk thoughts.', timestamp: new Date('2026-04-28T14:35:00').getTime(), location: null }] }
  const B = { id: 'b', startedAt: new Date('2026-04-30T09:00:00').getTime(), endedAt: new Date('2026-04-30T09:20:00').getTime(), body: [{ text: 'Second walk thoughts.', timestamp: new Date('2026-04-30T09:00:00').getTime(), location: null }] }

  it('includes every walk body in one document', () => {
    const md = journalToMarkdown([A, B])
    expect(md).toContain('First walk thoughts.')
    expect(md).toContain('Second walk thoughts.')
  })

  it('orders newest first', () => {
    const md = journalToMarkdown([A, B])
    expect(md.indexOf('Second walk thoughts.')).toBeLessThan(md.indexOf('First walk thoughts.'))
  })

  it('separates walks with a horizontal rule', () => {
    expect(journalToMarkdown([A, B])).toContain('\n\n---\n\n')
  })

  it('returns empty string for no walks', () => {
    expect(journalToMarkdown([])).toBe('')
  })
})
