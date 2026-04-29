# Footnote — chunk redesign handoff

**Session date:** 2026-04-28
**Picking up:** chunk architecture (body string → array of chunks)

---

## Goal

Upgrade `session.body` from a plain string to an array of `{text, timestamp, location}` chunks. This unblocks timestamp margins, per-chunk Coda review, and location-per-thought.

---

## What's done (this session)

- v0.1.0 shipped: flat-doc architecture, voice recording, auto-save
- v0.2.0 shipped: iCloud auto-export, FlatCodaSheet, session resume fix, voice indicator CSS, IdeaSheet, SessionList starred badges
- GitHub repo open-sourced: https://github.com/lee-fuhr/footnote
- GitHub Project board live (roadmap): https://github.com/users/lee-fuhr/projects/4
- 23 issues seeded and triaged on the board
- STT research done, issue #16 closed (stay on Web Speech API; Whisper.cpp WASM for Phase 1)
- Chunk overlay UI pattern filed as issue #26
- All chunk redesign decisions locked in `docs/_notes/chunk-redesign/`

## Current state

- Branch: `main`, clean, pushed
- Tests: 137 passing (`npx vitest run`)
- DB: v3 (`src/db/schema.js`)
- Vercel: auto-deploys from main

---

## Next task: chunk redesign

**All decisions documented in:**
- `docs/_notes/chunk-redesign/context.md` — what, why, success criteria
- `docs/_notes/chunk-redesign/decisions.md` — architecture locked
- `docs/_notes/chunk-redesign/open-questions.md` — all answered by Lee

**Locked decisions (don't re-litigate):**
- Chunk shape: `{text, timestamp, location}` stored inline in `sessions.body` (array replaces string)
- Chunk boundary: 2-minute idle = new chunk; under 2 min = extend last chunk
- No text movement in the UI ever — metadata as opacity-only overlays (issue #26)
- Per-chunk starring in Coda review (FlatCodaSheet becomes a step-through flow)
- Migration: v3 string body → wrapped in single chunk `{text: body, timestamp: session.startedAt, location: null}`

**Implementation order:**
1. Schema v4 + migration — TDD, red phase Bash output required before green
2. `appendChunk(sessionId, text, {timestamp, location})` + `flushChunk()` — replace `appendToBody`/`flushBody`
3. Editor.js — swap call sites (minimal change)
4. Export — render chunk array as timestamped markdown (>2 min gap = timestamp header)
5. FlatCodaSheet — per-chunk step-through (after 1–4 land)

**Key files:**
- `src/db/schema.js` — bump to v4, write migration cursor
- `src/db/index.js` — add `appendChunk`, `flushChunk`; keep old functions as aliases
- `src/ui/Editor.js` (424 lines — watch the 500-line cap)
- `src/export/markdown.js`, `src/export/text.js` — chunk array render path
- `src/ui/FlatCodaSheet.js` — redesign last, after DB layer is stable
- `tests/db.test.js` — primary test file for DB layer

**Start here:**
```
read /Users/lee/Sites/footnote/docs/_notes/chunk-redesign/context.md
read /Users/lee/Sites/footnote/docs/_notes/chunk-redesign/decisions.md
read /Users/lee/Sites/footnote/docs/_notes/chunk-redesign/open-questions.md
npx vitest run   ← establish baseline (137 tests)
```
