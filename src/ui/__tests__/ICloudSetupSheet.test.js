/**
 * Copy guardrail for ICloudSetupSheet.
 * Typography hygiene: no em dashes in user-facing prose.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'ICloudSetupSheet.js'),
  'utf8',
)

describe('ICloudSetupSheet — typography', () => {
  it('has no em dashes in the rendered copy', () => {
    expect(src).not.toContain('—')
  })
})
