import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/index.js', () => ({ getMeta: vi.fn() }))
vi.mock('../../tier.js', () => ({ hasAiPackAccess: vi.fn() }))

import { aiAnalysisEnabled } from '../aiSyncGate.js'
import { getMeta } from '../../db/index.js'
import { hasAiPackAccess } from '../../tier.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('aiAnalysisEnabled', () => {
  it('is true only when AI Pack access AND consent are both present', async () => {
    hasAiPackAccess.mockReturnValue(true)
    getMeta.mockResolvedValue(true)
    expect(await aiAnalysisEnabled()).toBe(true)
  })

  it('is false without AI Pack access (and never reads consent)', async () => {
    hasAiPackAccess.mockReturnValue(false)
    getMeta.mockResolvedValue(true)
    expect(await aiAnalysisEnabled()).toBe(false)
    expect(getMeta).not.toHaveBeenCalled()
  })

  it('is false when AI Pack is available but consent is not given', async () => {
    hasAiPackAccess.mockReturnValue(true)
    getMeta.mockResolvedValue(false)
    expect(await aiAnalysisEnabled()).toBe(false)
  })

  it('treats undefined consent as not enabled', async () => {
    hasAiPackAccess.mockReturnValue(true)
    getMeta.mockResolvedValue(undefined)
    expect(await aiAnalysisEnabled()).toBe(false)
  })
})
