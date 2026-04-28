import { describe, it, expect } from 'vitest'
import { dxToAction } from '../src/gestures.js'

describe('dxToAction', () => {
  it('rightward swipe > 60px returns star', () => {
    expect(dxToAction(61)).toBe('star')
    expect(dxToAction(80)).toBe('star')
    expect(dxToAction(200)).toBe('star')
  })

  it('leftward swipe < -60px returns pass', () => {
    expect(dxToAction(-61)).toBe('pass')
    expect(dxToAction(-80)).toBe('pass')
    expect(dxToAction(-200)).toBe('pass')
  })

  it('micro-movement within ±60px returns noop', () => {
    expect(dxToAction(0)).toBe('noop')
    expect(dxToAction(30)).toBe('noop')
    expect(dxToAction(-30)).toBe('noop')
    expect(dxToAction(60)).toBe('noop')
    expect(dxToAction(-60)).toBe('noop')
  })
})
