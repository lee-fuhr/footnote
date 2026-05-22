/**
 * Copy guardrail for WaitlistSheet.
 * Typography hygiene: curly apostrophes in user-facing prose.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'WaitlistSheet.js'),
  'utf8',
)

describe('WaitlistSheet — typography', () => {
  it('confirm copy uses a curly apostrophe (entity), not a straight one', () => {
    expect(src).toContain('You&rsquo;re on the list')
    expect(src).not.toContain("You're on the list")
  })
})
