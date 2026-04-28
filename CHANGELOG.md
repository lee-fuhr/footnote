# Changelog

All notable changes to Foot.Note are documented here.

---

## v0.1.0 — 2026-04-28

### Phase 0: flat-doc + voice

First public release. The core walk experience: start, speak, walk home, read.

**Architecture**
- Replaced discrete time-stamped entries with a single flat document per walk
- Auto-saves on every keystroke — no save button, no entry limbo
- `appendToBody()` + `flushBody()` — shared debounce with race-condition prevention on walk end

**Voice**
- Web Speech API integration via `VoiceRecognition` class
- Auto-restarts between utterances (iOS restart pattern)
- 5-failure backoff — stops gracefully if mic becomes unavailable
- Voice and keyboard feed the same debounce loop

**UI**
- Walk-end button (56px touch target) with "Walk saved." toast
- Back navigation from active walk
- Empty state: "Start typing. Your walk saves as you go."
- Grammarly disabled on textarea (was rendering as artifact)
- Legacy sessions (pre-v0.1.0) preserved and still accessible

**Export**
- Flat-doc sessions export as a single Markdown or plain text block
- Legacy sessions still export via line-by-line format

**Tests**
- 127 passing, 0 regressions
- IndexedDB tested via fake-indexeddb
- SpeechRecognition tested via Vitest mock
