export const IDLE = 'IDLE'
export const ACTIVE = 'ACTIVE'
export const CLOSING = 'CLOSING'

const NOOP = { effects: [] }

const TRANSITIONS = {
  [IDLE]: {
    openSession: {
      state: ACTIVE,
      effects: ['writeSessionToIDB', 'startHeartbeat', 'startInactivityTimer'],
    },
  },
  [ACTIVE]: {
    appendLine: {
      state: ACTIVE,
      effects: ['writeLineToIDB', 'updateHeartbeat', 'resetInactivityTimer'],
    },
    closeSession: {
      state: CLOSING,
      effects: ['writeEndedAt', 'clearLastActiveSessionId'],
    },
    timeGap: {
      state: CLOSING,
      effects: ['writeEndedAt', 'clearLastActiveSessionId'],
    },
  },
  [CLOSING]: {
    confirmClose: {
      state: IDLE,
      effects: ['clearHeartbeat', 'clearInactivityTimer'],
    },
  },
}

/** Pure state machine — no side effects. Returns { state, effects }. */
export function transition(currentState, event) {
  const stateTransitions = TRANSITIONS[currentState]
  if (!stateTransitions) return { state: currentState, ...NOOP }

  const next = stateTransitions[event]
  if (!next) return { state: currentState, ...NOOP }

  return next
}
