/**
 * Copy guardrail for InsightsSheet.
 * Typography hygiene: curly apostrophes, no em dashes in user-facing prose.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'InsightsSheet.js'),
  'utf8',
)

describe('InsightsSheet — typography', () => {
  it('power-note copy has no em dash', () => {
    const note = src
      .split('\n')
      .filter(l => l.includes('walking more than most') || l.includes('keeping pace'))
      .join(' ')
    expect(note).not.toContain('—')
  })
})
