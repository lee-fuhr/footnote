# Changelog

All notable changes to Foot.Note are documented here.

---

## v0.2.0 — 2026-04-28

### iCloud auto-export, flat-doc Coda review, session resume, idea form

**iCloud export**
- Walk end automatically exports to a user-chosen iCloud Drive folder as a `.md` file
- First walk opens a folder picker (requires a user gesture — walk end satisfies this)
- Subsequent walks write silently; "Walk saved to iCloud." toast on success
- Permission lapses gracefully — walk is always saved locally regardless

**Flat-doc review (FlatCodaSheet)**
- Post-walk review sheet for flat-doc sessions: shows full walk text, ★ Keep / Done
- Skipped automatically for legacy (line-based) sessions, which still use the old Coda sheet
- Session list shows ★ badge for starred walks and "Review" button for unreviewed flat-docs

**Session resume**
- Returning to the app mid-walk now restores the flat-doc textarea with saved body content
- Legacy sessions resume with their line list, same as before

**Community**
- "Got an idea? →" button in session list opens a pre-filled GitHub issue form
- `/roadmap` redirects to the live GitHub Project board

**Voice indicator**
- Pulsing dot appears in footer when voice recognition is active

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
