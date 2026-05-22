/**
 * Copy guardrail for FlatCodaSheet — the whole-walk Coda.
 *
 * Static source-text checks (the project vitest env is `node`, no DOM).
 * Locks the Done/Keep ambiguity fix: the two end-of-walk actions are a
 * mutually-exclusive pair (release vs. keep), so the neutral action must read
 * as "let it go", never the ambiguous "Done".
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'FlatCodaSheet.js'),
  'utf8',
)

describe('FlatCodaSheet — Coda action labels', () => {
  it('neutral close reads "Let it go", not the ambiguous "Done"', () => {
    expect(src).toContain('>Let it go<')
    expect(src).not.toContain('flat-coda-btn-done">Done<')
  })

  it('keep action stays "Keep"', () => {
    expect(src).toContain('Keep')
  })

  it('no em dashes in the rendered copy', () => {
    expect(src).not.toContain('—')
  })
})
