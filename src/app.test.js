import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const appSrc = readFileSync(
  fileURLToPath(new URL('./app.js', import.meta.url)),
  'utf8',
)

// Regression guard: the dev build badge ("M/D HH:MM" pill, bottom-right) must
// never be mounted unconditionally. Left ungated it leaked into the alpha and
// collided with the Insights swipe hint. It must go through the fn_dev-gated
// mountDevBadge() helper, which is unit-tested in devBadge.test.js.
describe('app boot — dev badge wiring', () => {
  it('routes the build badge through the gated mountDevBadge helper', () => {
    expect(appSrc).toMatch(/mountDevBadge/)
  })

  it('does not append a build badge unconditionally', () => {
    // No raw "_badge ... appendChild" sequence outside the gated helper.
    expect(appSrc).not.toMatch(/_badge\.id\s*=\s*['"]fn-build-badge['"]/)
  })
})
