/**
 * Copy guardrail for Editor — the first-run empty-state orientation copy.
 * This is the literal first thing a friend reads, so it must be in Lee's
 * voice (warm, plain) and free of em dashes.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'Editor.js'),
  'utf8',
)

describe('Editor — empty-state orientation copy', () => {
  it('opens with the rewritten walk/talk/Coda lines', () => {
    expect(src).toContain('Start walking. Tap below when a thought lands.')
    expect(src).toContain('Type it or say it.')
    expect(src).toContain('When you stop, you get a quiet look at what you caught.')
  })
})

describe('Editor — walk-end stays in the one flat document', () => {
  it('does not download a file on walk-end', () => {
    // downloadWalkFile threw iOS users into a file-viewer takeover on every
    // walk-end. The walk persists in IndexedDB; no auto-download.
    expect(src).not.toContain('downloadWalkFile')
  })

  it('does not open the separate FlatCodaSheet review screen on walk-end', () => {
    expect(src).not.toContain('flatCodaSheet')
    expect(src).not.toContain('FlatCodaSheet')
  })

  it('still autosaves silently to iCloud when a folder is connected', () => {
    expect(src).toContain('autoExport(sessionForExport)')
  })

  it('hands the just-ended session id to onSessionEnd so the journal can decorate it', () => {
    expect(src).toContain('onSessionEnd?.(sessionId)')
  })
})
