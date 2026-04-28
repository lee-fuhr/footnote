const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV

export const logger = {
  info(module, event, data = {}) {
    if (!IS_DEV) return
    console.log(JSON.stringify({ ts: Date.now(), level: 'info', module, event, data }))
  },
  warn(module, event, data = {}) {
    if (!IS_DEV) return
    console.warn(JSON.stringify({ ts: Date.now(), level: 'warn', module, event, data }))
  },
  error(module, event, data = {}) {
    console.error(JSON.stringify({ ts: Date.now(), level: 'error', module, event, data }))
  },
}
