// Thin wrapper so tests can run in Node where globalThis.crypto.randomUUID exists
export const crypto = globalThis.crypto
