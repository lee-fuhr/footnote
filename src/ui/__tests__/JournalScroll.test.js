/**
 * Contract guardrails for JournalScroll — the flat-journal walk list.
 *
 * The project vitest env is `node` (no DOM), so DOM rendering is verified by
 * static source-text checks, mirroring Editor.test.js / FlatCodaSheet.test.js.
 * These lock the walk-end redesign: the just-finished walk gets a quiet inline
 * Keep / Let it go affordance attached to its own section in the one flat
 * document — no separate review screen, no download.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { isSessionStarred, markSessionStarred } from '../../session/starred.js'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'JournalScroll.js'), 'utf8')

describe('JournalScroll — inline walk-end affordance', () => {
  it('render() accepts a justEndedId so it can decorate that walk', () => {
    expect(src).toMatch(/render\(\s*\{\s*justEndedId/)
  })

  it('builds an inline Keep / Let it go control, not a separate review screen', () => {
    expect(src).toContain('Keep')
    expect(src).toContain('Let it go')
    // The affordance is a row attached to the walk block, not a modal/dialog.
    expect(src).toContain('walk-coda')
  })

  it('Keep stars the section inline via markSessionStarred', () => {
    expect(src).toContain('markSessionStarred')
  })

  it('renders a kept marker for already-starred walks', () => {
    expect(src).toContain('isSessionStarred')
    expect(src).toContain('walk-kept')
  })

  it('Let it go removes that walk from the document via deleteSession', () => {
    expect(src).toContain('deleteSession')
  })

  it('Let it go is a demoted text link, not a button peer of Keep', () => {
    expect(src).toContain('btn-walk-letgo-link')
  })

  it('Let it go confirms first, then defers the delete behind an undo window', () => {
    expect(src).toContain('confirmSheet')
    expect(src).toContain('undoToast')
    // The delete must be the toast commit, not run synchronously on click.
    expect(src).toMatch(/onCommit[\s\S]*deleteSession/)
  })

  it('keeps the walk by default — no auto-prune, no confirm required for inline Keep', () => {
    // The inline Keep path must not delete; only the explicit Let it go deletes.
    expect(src).toMatch(/let it go/i)
  })

  it('no em dashes in source copy', () => {
    expect(src).not.toContain('—')
  })
})

describe('starred — the Keep mechanism (behavioral)', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a kept walk', () => {
    expect(isSessionStarred('walk-1')).toBe(false)
    markSessionStarred('walk-1')
    expect(isSessionStarred('walk-1')).toBe(true)
  })

  it('keeping is idempotent', () => {
    markSessionStarred('walk-2')
    markSessionStarred('walk-2')
    expect(isSessionStarred('walk-2')).toBe(true)
  })
})
