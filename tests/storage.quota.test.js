import { describe, it, expect } from 'vitest'
import { getQuotaLevel, QUOTA_LEVELS } from '../src/storage/quota.js'

describe('storage quota thresholds', () => {
  it('exports QUOTA_LEVELS with correct keys', () => {
    expect(QUOTA_LEVELS).toHaveProperty('ok')
    expect(QUOTA_LEVELS).toHaveProperty('log')
    expect(QUOTA_LEVELS).toHaveProperty('warn')
    expect(QUOTA_LEVELS).toHaveProperty('urgent')
    expect(QUOTA_LEVELS).toHaveProperty('block')
  })

  it('0% → ok', () => expect(getQuotaLevel(0)).toBe('ok'))
  it('50% → ok', () => expect(getQuotaLevel(50)).toBe('ok'))
  it('59% → ok', () => expect(getQuotaLevel(59)).toBe('ok'))
  it('60% → log', () => expect(getQuotaLevel(60)).toBe('log'))
  it('75% → log', () => expect(getQuotaLevel(75)).toBe('log'))
  it('79% → log', () => expect(getQuotaLevel(79)).toBe('log'))
  it('80% → warn', () => expect(getQuotaLevel(80)).toBe('warn'))
  it('89% → warn', () => expect(getQuotaLevel(89)).toBe('warn'))
  it('90% → urgent', () => expect(getQuotaLevel(90)).toBe('urgent'))
  it('94% → urgent', () => expect(getQuotaLevel(94)).toBe('urgent'))
  it('95% → block', () => expect(getQuotaLevel(95)).toBe('block'))
  it('100% → block', () => expect(getQuotaLevel(100)).toBe('block'))
})
