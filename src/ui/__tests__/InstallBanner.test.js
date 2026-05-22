/**
 * Copy guardrail for InstallBanner.
 *
 * TRUST-CRITICAL: the banner must NOT claim notes and GPS "never leave" the
 * device unconditionally. With sync now gated behind AI analysis (sync/server.js
 * + sync/aiSyncGate.js), the honest promise is conditional: walks stay local,
 * and the one thing that leaves is walk text — only when AI analysis is on.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'InstallBanner.js'),
  'utf8',
)

describe('InstallBanner — honest privacy claim', () => {
  it('does not assert that notes and GPS never leave the device', () => {
    expect(src).not.toContain('never leave this device')
    expect(src).not.toContain('never leave your')
    expect(src).not.toContain('nothing ever leaves')
  })

  it('states the AI-analysis exception so the privacy promise is conditional', () => {
    expect(src).toContain('AI analysis')
    expect(src).toContain('Claude')
  })
})
