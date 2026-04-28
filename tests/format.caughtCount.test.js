import { describe, it, expect } from 'vitest'
import { caughtCount } from '../src/format/caughtCount.js'

describe('caughtCount — Coda summary phrasing', () => {
  it('returns "Nothing caught." for zero', () => {
    expect(caughtCount(0)).toBe('Nothing caught.')
  })

  it('returns "One caught." for 1', () => {
    expect(caughtCount(1)).toBe('One caught.')
  })

  it('spells small numbers as words', () => {
    expect(caughtCount(2)).toBe('Two caught.')
    expect(caughtCount(3)).toBe('Three caught.')
    expect(caughtCount(4)).toBe('Four caught.')
    expect(caughtCount(5)).toBe('Five caught.')
    expect(caughtCount(6)).toBe('Six caught.')
    expect(caughtCount(7)).toBe('Seven caught.')
    expect(caughtCount(8)).toBe('Eight caught.')
    expect(caughtCount(9)).toBe('Nine caught.')
  })

  it('uses numerals at 10 and above', () => {
    expect(caughtCount(10)).toBe('10 caught.')
    expect(caughtCount(11)).toBe('11 caught.')
    expect(caughtCount(42)).toBe('42 caught.')
  })

  it('returns empty string for nonsense input', () => {
    expect(caughtCount(NaN)).toBe('')
    expect(caughtCount(undefined)).toBe('')
    expect(caughtCount(-1)).toBe('')
    expect(caughtCount(null)).toBe('')
  })

  it('coerces stringy numbers', () => {
    expect(caughtCount('3')).toBe('Three caught.')
    expect(caughtCount('10')).toBe('10 caught.')
  })
})
