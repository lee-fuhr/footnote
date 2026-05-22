# Foot.Note — technical architecture spec

**Version:** 1.0
**Date:** 2026-04-23
**Produced by:** Architecture Analyst (Plan agent)
**Status:** Ready for build — pending Lee approval

---

## 0. Orientation

iOS Safari is not a first-class PWA runtime. It is a hostile environment that we are choosing to target because it lives in our users' pockets. Every decision below is filtered through that lens. When in doubt, do less, more reliably.

**Guiding principle:** A timestamped text line that saves is worth more than a GPS-tagged voice note that fails silently.

---

## 1. PWA setup

### 1.1 Manifest

**Decision:** Standard `manifest.json`, not dynamic. No app shell tricks.

```json
{
  "name": "Foot.Note",
  "short_name": "Foot.Note",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

iOS Safari ignores `purpose: maskable` and several manifest fields but reads `name`, `start_url`, `display`, and `icons`. Keeping manifest minimal avoids parsing bugs in older iOS Safari.

**iOS Safari install UX reality:** No `beforeinstallprompt` event on iOS. Only install path: Safari's Share sheet → "Add to Home Screen." Display a manual prompt banner on first load. Dismiss and never show again (`localStorage` flag `install_prompted`).

### 1.2 Service worker strategy

**Decision:** Workbox via CDN import. Cache-first for app shell, network-first for nothing (no server calls in MVP).

Two caches:
- `footnote-shell-v1`: HTML, CSS, JS, icons — cache-first, update on install
- `footnote-fonts-v1`: Any web fonts — cache-first, long TTL

On `install`: pre-cache all shell assets, `skipWaiting()`.
On `activate`: delete old cache versions, `clients.claim()`.
On `fetch`: shell assets → cache-first; anything else → passthrough (Web Speech API needs network).

### 1.3 Install prompt UX

Single dismissible banner in `src/ui/InstallBanner.js`. Show if not in standalone mode and `install_prompted` is null. Copy: "For the best experience and offline access, install Foot.Note: tap Share → Add to Home Screen."

---

## 2. Data model

### 2.1 IndexedDB schema

**Database:** `footnote-db`, version 1. Three object stores.

**Object store: `sessions`**
```
keyPath: 'id' (UUID v4)
Indexes: startedAt (number), endedAt (number, nullable)

{
  id: string,
  startedAt: number,        // epoch ms
  endedAt: number|null,     // null = active
  title: string|null,       // auto-title from first line, user-editable
  lineCount: number,        // denormalized for list view
  approximateLocation: { lat, lng, accuracy } | null
}
```

**Object store: `lines`**
```
keyPath: 'id' (UUID v4)
Indexes: sessionId, createdAt, text

{
  id: string,
  sessionId: string,
  createdAt: number,        // epoch ms
  text: string,
  location: { lat, lng, accuracy, capturedAt } | null,
  locationStatus: 'live' | 'stale' | 'unavailable',
  audioBlob: Blob | null    // V2 placeholder only
}
```

**Object store: `metadata`**
```
keyPath: 'key'
Entries: schema_version, last_active_session_id, total_lines
```

### 2.2 Atomic write pattern

Every multi-store write uses a single IndexedDB transaction spanning all affected stores. Never write partial state.

Example: closing a session writes `sessions` (set `endedAt`) and `metadata` (clear `last_active_session_id`) in one transaction. If either fails, neither commits.

All IndexedDB operations exposed through `src/db/index.js`:
- `openSession()` → Promise\<Session\>
- `closeSession(sessionId)` → Promise\<void\>
- `appendLine(sessionId, text, location)` → Promise\<Line\>
- `getSessionLines(sessionId)` → Promise\<Line[]\>
- `getAllSessions()` → Promise\<Session[]\>
- `searchLines({text?, dateRange?, nearLocation?})` → Promise\<Line[]\>
- `getStorageEstimate()` → Promise\<{used, quota, percent}\>
- `deleteSession(sessionId)` → Promise\<void\>

---

## 3. Session auto-detection algorithm

### 3.1 Session boundary triggers

**Trigger A: Time gap > 30 minutes**

On every line save, write `last_active_session_id` and current timestamp to `sessionHeartbeat` in metadata. On app open, read `sessionHeartbeat`. If `Date.now() - heartbeat.ts > 30 * 60 * 1000`, close previous session and open a new one automatically.

The 30-minute check runs only on app open. There is no background timer — iOS kills background timers.

**Trigger B: Explicit app close**

Use `visibilitychange` and `pagehide` events. When `document.visibilityState === 'hidden'` or `pagehide` fires:
1. Write final heartbeat timestamp
2. Write `endedAt` to current session (close it)
3. Do not open a new session — that happens on next open

Do not use `beforeunload` — unreliable on iOS Safari.

**Trigger C: Step detection stop (approximation)**

True step detection (`Pedometer`) is not available in browsers. Approximation: if no new line in 20 minutes AND session is active, show a non-blocking toast: "Still walking? Tap to keep session open." If no response in 60 seconds, close the session.

Implemented with a `setInterval` checking `Date.now() - lastLineTimestamp` every 60 seconds. Interval is killed on `visibilitychange` to avoid battery drain. No `DeviceMotionEvent` — requires permission prompt, adds friction.

### 3.2 Session state machine

States: `IDLE` → `ACTIVE` → `CLOSING` → `IDLE`

Pure state machine in `src/session/state.js`. No side effects inside — returns next state + list of effects. Effects executed by caller. Fully unit-testable without IndexedDB.

```
IDLE + openSession        → ACTIVE,  effects: [writeSessionToIDB, startHeartbeat, startInactivityTimer]
ACTIVE + appendLine       → ACTIVE,  effects: [writeLineToIDB, updateHeartbeat, resetInactivityTimer]
ACTIVE + closeSession     → CLOSING, effects: [writeEndedAt, clearLastActiveSessionId]
CLOSING + confirmClose    → IDLE,    effects: [clearHeartbeat, clearInactivityTimer]
ACTIVE + timeGap          → CLOSING, (same effects as closeSession)
```

---

## 4. GPS capture strategy

### 4.1 Lock strategy

Require a GPS fix before first line can be saved. Allow session to start with pending lock (spinner). If GPS denied or times out after 10 seconds, offer: "Location unavailable — notes will be saved without GPS. Continue?"

```javascript
navigator.geolocation.getCurrentPosition(onSuccess, onError,
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 })

navigator.geolocation.watchPosition(onPositionUpdate, onPositionError,
  { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 })
```

### 4.2 Position cache

In-memory cache in `src/gps/index.js`:
```javascript
let lastPosition = { lat, lng, accuracy, capturedAt, isStale: false }
```

**Stale detection:** If `Date.now() - lastPosition.capturedAt > 60000` (1 minute), mark stale. Checked on every `appendLine` call, not on a timer.

### 4.3 Line location assignment

On `appendLine`:
- `capturedAt` null → `locationStatus: 'unavailable'`, `location: null`
- Within 60 seconds → `locationStatus: 'live'`, copy coords
- Over 60 seconds → `locationStatus: 'stale'`, copy coords with UI warning

### 4.4 UI indicator

Persistent GPS status dot in header:
- Green: live, accuracy < 20m
- Yellow: live, accuracy ≥ 20m
- Orange: stale
- Red: unavailable

One CSS class swap, no JS animation. Tap for accuracy details.

### 4.5 Permission flow

Request via `getCurrentPosition` — triggers native iOS prompt. Do not use `navigator.permissions.query()` as primary (iOS 16+ only). Store result in `localStorage.setItem('gps_permission', 'granted'|'denied'|'unknown')` for synchronous startup read.

---

## 5. Voice dictation

**Decision: Defer voice to V2 checkpoint. Ship text-only MVP first.**

Four failure modes on iOS Safari: stops when screen locks, requires internet, may trigger Siri, can't save interim results atomically. Too many unknowns to debug simultaneously with GPS and IndexedDB.

### 5.1 V2 voice architecture (design now, build later)

Single-utterance mode (not continuous) per line to avoid screen-lock kill:

```javascript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.continuous = false
recognition.interimResults = false
recognition.lang = 'en-US'
recognition.maxAlternatives = 1
```

On `onresult`: populate text input, call `appendLine`. Same code path as typed text.

Error handling:
- `'network'` or `'service-not-allowed'` → toast "Voice unavailable — type instead"
- `'not-allowed'` → persistent banner "Microphone access denied — enable in Settings"

---

## 6. Export pipeline

### 6.1 Markdown export

Pure function in `src/export/markdown.js`.

Format:
```markdown
# Walk session — April 23, 2026

**Started:** 9:14 AM | **Ended:** 10:02 AM | **Duration:** 48 min
**Lines:** 12

---

**9:14 AM** · 📍 40.7580° N, 73.9855° W _(accuracy: 8m)_
Called Marcus about the Q3 plan.

**9:22 AM** · 📍 _GPS last seen 9:14 AM (stale)_
The pricing model is wrong because...

**9:31 AM** · 📍 _GPS unavailable_
Buy milk on the way home.

---
_Exported from Foot.Note on April 23, 2026 at 10:15 AM_
```

### 6.2 Plain text export

Same file, second export. Tab-delimited timestamp and text, one line per note.

```
9:14 AM [40.7580, -73.9855 ±8m]  Called Marcus about the Q3 plan...
9:22 AM [GPS stale from 9:14 AM] The pricing model is wrong because...
```

### 6.3 Export trigger

Web Share API primary (`navigator.share` — iOS Safari 12.4+): share as `.md` file attachment, opens native iOS share sheet.

```javascript
const file = new File([markdownString], `footnote-${sessionDate}.md`, { type: 'text/markdown' })
navigator.share({ files: [file], title: 'Foot.Note Export' })
```

Fallback: `<a download>` blob click → downloads to Files app.

No ZIP export in MVP. One session at a time.

---

## 7. Storage quota management

### 7.1 Quota check

`navigator.storage.estimate()` runs on app open, after every session close, never more than once per 5 minutes. In `src/storage/quota.js`.

### 7.2 Thresholds

| Usage | Action |
|---|---|
| < 60% | No action |
| 60–80% | Log only |
| 80–90% | Dismissible yellow banner: "Storage at 80% — consider exporting old sessions" |
| 90–95% | Persistent orange banner with Export button |
| > 95% | Block new session start. Modal: "Storage full. Export and delete sessions to continue." |

Block at 95% not 100% because IndexedDB writes fail silently on some iOS versions when quota exceeded.

### 7.3 Eviction defense

1. **Export early, export often** — session list shows "Last exported: X days ago" per session
2. **Opportunistic persistence** — call `navigator.storage.persist()` on first session start (iOS Safari 15.4+)
3. **Never sole backup** — copy: "Foot.Note stores locally. Export to keep permanently."

### 7.4 Session deletion

Swipe-to-delete or long-press menu. Confirmation: "Delete this session? Export first to save permanently." Options: "Export then Delete" and "Delete Without Exporting."

Delete is a single IndexedDB transaction: delete all `lines` with matching `sessionId`, delete the `sessions` record, update `metadata.total_lines`.

---

## 8. Offline-first strategy

### 8.1 What works offline

Everything except voice dictation:
- View past sessions
- Start new session, append lines with GPS (cached)
- Export sessions to file
- Search sessions

### 8.2 Pre-cached assets

```
/, /index.html, /app.css, /app.js, /icons/icon-192.png, /icons/icon-512.png, /manifest.json
```

Zero CDN resources. Zero external fonts. System font stack: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

### 8.3 Voice dictation offline

Web Speech API requires network. When offline: dictation button greyed out, tooltip "Voice requires internet connection."

---

## 9. Build tooling

### 9.1 Decision: Vite + vanilla JS

**Not React, Vue, or Svelte.** The app is a text input with stateful decorations. No framework needed.

Vite because: content-hashed output (critical for service worker), `vite-plugin-pwa` generates SW and manifest, HMR during development, Rollup-based tree-shaken bundle.

**JavaScript with JSDoc type annotations, not TypeScript.** No compile step for types, IDE autocomplete without `tsc`. Migrate to TypeScript if the project grows a team.

### 9.2 Dev dependencies

```json
{
  "devDependencies": {
    "vite": "^5.x",
    "vite-plugin-pwa": "^0.20.x",
    "workbox-core": "^7.x",
    "workbox-precaching": "^7.x",
    "vitest": "^1.x",
    "fake-indexeddb": "^5.x"
  },
  "dependencies": {}
}
```

Zero production dependencies. Everything lives in the browser.

---

## 10. Testing strategy

### 10.1 Automatable (Vitest)

| Module | What to test |
|---|---|
| `src/session/state.js` | All state machine transitions, edge cases |
| `src/export/markdown.js` | All 3 locationStatus values, empty session, unicode |
| `src/export/text.js` | Same |
| `src/gps/staleness.js` | 59s = live, 61s = stale, null = unavailable |
| `src/storage/quota.js` | Threshold calculations |
| `src/session/gap.js` | 29 min = no gap, 31 min = gap |
| `src/db/index.js` | Via `fake-indexeddb` |

### 10.2 Manual device test matrix (iPhone, iOS 16+, real device, not Simulator)

| Test | Scenario | Pass criteria |
|---|---|---|
| IOS-01 | Install to home screen | App opens in standalone mode |
| IOS-02 | Offline session | 3 lines save with timestamps in Airplane Mode |
| IOS-03 | GPS lock | Green dot within 10 seconds |
| IOS-04 | GPS stale on background | Line after 90s screen lock shows orange stale indicator |
| IOS-05 | GPS denied | Text-only mode offered, no crash |
| IOS-06 | 31-min gap detection | Previous session closed, new session opened |
| IOS-07 | 29-min gap (no trigger) | Same session continues |
| IOS-08 | Explicit close | Session has `endedAt` after swipe-away |
| IOS-09 | Export to Files | Share sheet appears, file saves |
| IOS-10 | Export offline | Export works in Airplane Mode |
| IOS-11 | Private Browsing | App loads, IndexedDB works |
| IOS-12 | Storage warning | Yellow banner at 80% |
| IOS-13 | Storage persistence | `navigator.storage.persist()` called on first session |
| IOS-14 | Install banner | Shows in Safari (not standalone) |
| IOS-15 | Install banner dismiss | Does not reappear after dismiss |

**Simulator cannot test:** GPS behavior, background suspension, memory pressure eviction, `navigator.standalone`.

---

## 11. Checkpoint gates

### Gate 1: Text-only MVP ships

All must pass:
- [ ] IOS-01 through IOS-15 pass
- [ ] Every line saves with timestamp in < 500ms
- [ ] 30-minute gap detection works (IOS-06, IOS-07)
- [ ] GPS gracefully degrades when backgrounded and when denied
- [ ] Markdown + plain text export via share sheet
- [ ] App works fully offline
- [ ] Storage quota warning at 80%
- [ ] All Vitest unit tests pass
- [ ] No file over 500 lines
- [ ] Zero production npm dependencies

**Gate 1 is the ship decision for public announcement.**

### Gate 2: Voice MVP ships

Prerequisites: Gate 1 complete and stable for ≥2 weeks personal use.

All must pass:
- [ ] Voice produces text from speech on real iPhone in Safari
- [ ] Fails gracefully offline (greyed button, toast)
- [ ] Fails gracefully when mic permission denied
- [ ] Screen lock during dictation: partial transcript not lost
- [ ] 2+ minute voice note captured without cut-off
- [ ] IOS-01 through IOS-15 still pass (no regression)
- [ ] All Web Speech API error codes have user-visible handling

---

## 12. File layout

```
footnote/
├── index.html                   ~30 lines
├── vite.config.js               ~40 lines
├── package.json
├── vitest.config.js             ~10 lines
│
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── manifest.json            (generated by vite-plugin-pwa)
│
├── src/
│   ├── app.js                   ~80 lines — top-level init, event wiring only
│   ├── app.css                  ~200 lines
│   │
│   ├── db/
│   │   ├── index.js             ~100 lines — barrel + db open/init
│   │   ├── sessions.js          ~120 lines
│   │   ├── lines.js             ~150 lines
│   │   └── metadata.js          ~60 lines
│   │
│   ├── session/
│   │   ├── state.js             ~120 lines — pure state machine
│   │   ├── gap.js               ~40 lines — gap detection logic
│   │   └── manager.js           ~100 lines — wires state machine to IDB + timers
│   │
│   ├── gps/
│   │   ├── index.js             ~120 lines — watchPosition, cache, stale detection
│   │   └── staleness.js         ~30 lines — pure staleness functions
│   │
│   ├── export/
│   │   ├── markdown.js          ~80 lines
│   │   ├── text.js              ~50 lines
│   │   └── share.js             ~60 lines — Web Share API + fallback download
│   │
│   ├── storage/
│   │   └── quota.js             ~80 lines
│   │
│   ├── ui/
│   │   ├── SessionList.js       ~150 lines
│   │   ├── Editor.js            ~200 lines
│   │   ├── GpsIndicator.js      ~60 lines
│   │   ├── StorageBanner.js     ~70 lines
│   │   └── InstallBanner.js     ~50 lines
│   │
│   └── logger.js                ~60 lines
│
└── tests/
    ├── session.state.test.js    ~150 lines
    ├── session.gap.test.js      ~60 lines
    ├── export.markdown.test.js  ~100 lines
    ├── export.text.test.js      ~60 lines
    ├── gps.staleness.test.js    ~60 lines
    ├── storage.quota.test.js    ~60 lines
    └── db.lines.test.js         ~120 lines (fake-indexeddb)
```

~30 source files + tests. Largest: `Editor.js` (~200 lines), `SessionList.js` (~150 lines). All under 500-line limit with headroom.

---

## 13. Key architectural decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | Vanilla JS + Vite | No runtime dependency, debuggable on-device |
| State | Module-scope + explicit DOM updates | No virtual DOM, simpler debugging |
| Types | JSDoc annotations | No compile step, IDE autocomplete |
| Storage | IndexedDB only | localStorage blocks main thread, 5MB limit |
| Session boundaries | Heartbeat-on-close + gap check on open | iOS kills background timers |
| GPS stale threshold | 60 seconds | Updates every 1–5s when active; 60s = definitely backgrounded |
| Export format | Markdown primary, plain text secondary | Opens in Notes, Bear, Obsidian; plain text is universal fallback |
| Voice dictation | V2, not MVP | Too many iOS failure modes to debug simultaneously |
| Font | System font stack | Zero network dependency, renders offline |

---

## 14. Structured logging

`src/logger.js` — thin wrapper, zero external dependency.

```javascript
// { ts, level, module, event, data }
// In production: only 'warn' and 'error'
// In dev: all levels

logger.info('gps', 'position_update', { lat, lng, accuracy })
logger.warn('storage', 'quota_threshold', { percent: 82 })
logger.error('db', 'write_failed', { store: 'lines', error: err.message })
```

Log: all IndexedDB errors, GPS errors, session open/close events, quota checks. Do not log line content (privacy). Browser console only — no server, no persistence.
