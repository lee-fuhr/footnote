import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const shareSrc = readFileSync(
  fileURLToPath(new URL('./share.js', import.meta.url)),
  'utf8',
)

// Brand guard: the wordmark is "Footnote" (one word, no period). The native
// share-sheet title must not regress to the old "Foot.Note" form.
describe('share — brand naming', () => {
  it('uses the "Footnote" wordmark in the share title', () => {
    expect(shareSrc).toMatch(/title:\s*['"]Footnote Export['"]/)
  })

  it('never uses the "Foot.Note" period form', () => {
    expect(shareSrc).not.toMatch(/Foot\.Note/)
  })
})
