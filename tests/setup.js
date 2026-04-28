// Vitest setup: minimal localStorage mock for tests that exercise client-side state.
// Pure in-memory Map. Force-install over any environment default (Node 21+ ships a
// partial implementation that can throw without an explicit location).
const store = new Map()
const shim = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: k => { store.delete(k) },
  clear: () => { store.clear() },
  get length() { return store.size },
  key: i => [...store.keys()][i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', {
  value: shim,
  writable: true,
  configurable: true,
})

// SpeechRecognition mock — registered on globalThis so recognition.js resolves it
// via `globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition`.
// iOS Safari uses the webkit-prefixed name; register both for compatibility.
import { MockSpeechRecognition } from './mocks/speechRecognition.js'
globalThis.SpeechRecognition = MockSpeechRecognition
globalThis.webkitSpeechRecognition = MockSpeechRecognition
