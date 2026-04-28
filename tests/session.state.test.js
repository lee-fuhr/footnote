import { describe, it, expect } from 'vitest'
import { transition, IDLE, ACTIVE, CLOSING } from '../src/session/state.js'

describe('session state machine', () => {
  describe('IDLE transitions', () => {
    it('openSession from IDLE → ACTIVE with correct effects', () => {
      const result = transition(IDLE, 'openSession')
      expect(result.state).toBe(ACTIVE)
      expect(result.effects).toContain('writeSessionToIDB')
      expect(result.effects).toContain('startHeartbeat')
      expect(result.effects).toContain('startInactivityTimer')
    })

    it('any other event from IDLE → stays IDLE, no effects', () => {
      const result = transition(IDLE, 'appendLine')
      expect(result.state).toBe(IDLE)
      expect(result.effects).toHaveLength(0)
    })

    it('closeSession from IDLE → stays IDLE, no effects', () => {
      const result = transition(IDLE, 'closeSession')
      expect(result.state).toBe(IDLE)
      expect(result.effects).toHaveLength(0)
    })
  })

  describe('ACTIVE transitions', () => {
    it('appendLine from ACTIVE → ACTIVE with correct effects', () => {
      const result = transition(ACTIVE, 'appendLine')
      expect(result.state).toBe(ACTIVE)
      expect(result.effects).toContain('writeLineToIDB')
      expect(result.effects).toContain('updateHeartbeat')
      expect(result.effects).toContain('resetInactivityTimer')
    })

    it('closeSession from ACTIVE → CLOSING with correct effects', () => {
      const result = transition(ACTIVE, 'closeSession')
      expect(result.state).toBe(CLOSING)
      expect(result.effects).toContain('writeEndedAt')
      expect(result.effects).toContain('clearLastActiveSessionId')
    })

    it('timeGap from ACTIVE → CLOSING with same effects as closeSession', () => {
      const result = transition(ACTIVE, 'timeGap')
      expect(result.state).toBe(CLOSING)
      expect(result.effects).toContain('writeEndedAt')
      expect(result.effects).toContain('clearLastActiveSessionId')
    })

    it('openSession from ACTIVE → stays ACTIVE (no double-open)', () => {
      const result = transition(ACTIVE, 'openSession')
      expect(result.state).toBe(ACTIVE)
      expect(result.effects).toHaveLength(0)
    })
  })

  describe('CLOSING transitions', () => {
    it('confirmClose from CLOSING → IDLE with correct effects', () => {
      const result = transition(CLOSING, 'confirmClose')
      expect(result.state).toBe(IDLE)
      expect(result.effects).toContain('clearHeartbeat')
      expect(result.effects).toContain('clearInactivityTimer')
    })

    it('any other event from CLOSING → stays CLOSING, no effects', () => {
      const result = transition(CLOSING, 'appendLine')
      expect(result.state).toBe(CLOSING)
      expect(result.effects).toHaveLength(0)
    })
  })

  describe('full cycle', () => {
    it('IDLE → ACTIVE → CLOSING → IDLE completes cleanly', () => {
      let r = transition(IDLE, 'openSession')
      expect(r.state).toBe(ACTIVE)

      r = transition(r.state, 'appendLine')
      expect(r.state).toBe(ACTIVE)

      r = transition(r.state, 'closeSession')
      expect(r.state).toBe(CLOSING)

      r = transition(r.state, 'confirmClose')
      expect(r.state).toBe(IDLE)
    })

    it('auto-close via timeGap cycles correctly', () => {
      let r = transition(IDLE, 'openSession')
      r = transition(r.state, 'appendLine')
      r = transition(r.state, 'timeGap')
      expect(r.state).toBe(CLOSING)
      r = transition(r.state, 'confirmClose')
      expect(r.state).toBe(IDLE)
    })
  })
})
