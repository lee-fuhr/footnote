/**
 * Copy guardrail for SettingsSheet.
 * Locks the AI-analysis disclosure: the toggle subtext must tell the user,
 * right on the toggle, that their walk text is sent to Claude and discarded.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'SettingsSheet.js'),
  'utf8',
)

describe('SettingsSheet — AI analysis disclosure', () => {
  it('toggle subtext discloses that text is sent to Claude then discarded', () => {
    expect(src).toContain('sent to Claude to find patterns, then discarded')
  })

  it('no em dashes in the rendered copy', () => {
    expect(src).not.toContain('—')
  })
})
