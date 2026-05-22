/**
 * Contract guardrails for UndoToast — the deferred-action undo affordance.
 *
 * Vitest env is `node` (no DOM), so behavior is locked via static source
 * checks, mirroring JournalScroll.test.js / Editor.test.js. These pin the
 * deferral contract: the destructive action is scheduled, not run, and a tap
 * on Undo cancels it before it commits.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'UndoToast.js'), 'utf8')

describe('UndoToast — deferred undo', () => {
  it('exposes undoToast', () => {
    expect(src).toMatch(/export function undoToast/)
  })

  it('defers the action with a timer rather than running it immediately', () => {
    expect(src).toContain('setTimeout')
    expect(src).toContain('onCommit')
  })

  it('Undo cancels the pending commit', () => {
    expect(src).toContain('clearTimeout')
    expect(src).toMatch(/onUndo/)
  })

  it('renders an Undo button', () => {
    expect(src).toContain('undo-toast-btn')
    expect(src).toContain('Undo')
  })

  it('reuses a single element instead of churning the DOM per call', () => {
    expect(src).toMatch(/if \(_el\) return _el/)
  })

  it('no em dashes in source copy', () => {
    expect(src).not.toContain('—')
  })
})
