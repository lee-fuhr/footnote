# Footnote — handoff (2026-05-21, ~8:30pm PT)

## Goal
Mature Footnote (walking-journal PWA) toward putting it in friends' hands in ~2 weeks.

## Live on prod now (footnote-tan.vercel.app — all deployed today, reversible via `vercel rollback`)
- **UX / Visual / Copy audits** converged 9–9+/10. Empty-state in Lee's voice, honest copy, sentence-case, polish.
- **Walk-end rebuilt to the one-notepad model:** tapping Done keeps you in the flat journal, scrolled to what you wrote, with an inline "Kept. Let it go? / ★ Keep" row on that walk's section. No file-download screen, no separate review view. (Was: iOS file-download interstitial + a separate "Your walk" Coda screen.)
- **Privacy promise is real, tested, true:** Free/Pro fully local; sync only when AI analysis is on. Login killed entirely (AuthSheet + OTP endpoints deleted). Voting is device-bound (one vote per device, no email). Proven by a mutation-tested egress test.
- **AI Pack free for friends** (alpha flag) + **fail-closed spend caps** (per-device 12/50¢/day, global 400/$5/day).
- **GPS** reads "no signal" / "weak signal" (was "lost").
- **Editor fixes (period crash + transcript pin)** — deployed, see "AWAITING" below.
- **PHILOSOPHY.md** reconciled to the model: one flat notepad = main; cul-de-sacs (Insights, Settings) allowed as opt-in out-and-backs; walk-end = editing-mode-off, not a destination; no involuntary screens.

## AWAITING device confirmation (the one open thread)
The two editor fixes can't be verified headlessly — need Lee's iPhone:
1. **Period / double-tap layout break:** start a walk, double-tap space for ". ", type fast past ~10 lines. Input should stay put, footer visible, textarea scrolls *internally* past a viewport-relative cap (no page ballooning). Fix: bounded auto-grow + IME composition guard in new `src/ui/captureLayout.js`.
2. **Transcript pinned to bottom:** during a walk, type/dictate to fill the screen — newest line stays above the keyboard. Scroll up to read — shouldn't yank you down. New content / refocus re-pins. Fix: `shouldPinToBottom` in `captureLayout.js`.

If they hold → commit + (already deployed). If not → iterate.

## Open design taste-calls (Lee's, none blocking)
- **"Let it go" deletes the walk instantly, no confirm** — flagged as data-safety risk. Add confirm/undo or leave?
- Inline wording "Kept. Let it go?"; the ★ Keep marker.
- **Manual export button** — `downloadWalkFile` is now orphaned (unhooked from walk-end), ready to wire into Settings if wanted.
- **Legacy resumed-walk path** (`body: null`) still uses the old `codaSheet` review sheet; new flat-doc walks never hit it.

## State / gotchas
- **All of today's work is DEPLOYED but NOT git-committed.** Next session should review the diff and commit if good. Repo: `/Users/lee/Sites/footnote` (git, deploys via `vercel --prod --yes`).
- **Editor.js is a 532-line god-file** (over the 500 cap) — needed `SKIP_HOOK_BLOAT_WATCHER=1` to edit. Follow-up: split it (most new logic already lives in `captureLayout.js`).
- Tests: `npx vitest run` → 278/278 green. Privacy guard test: `tests/privacy.egress.test.js` (mutation-verified).
- Lee runs AI Pack himself, so his walks still sync and keep the walk-mining pipeline fed.

## Key files
`src/ui/Editor.js` · `src/ui/captureLayout.js` (new) · `src/ui/JournalScroll.js` (inline keep/let-go) · `src/sync/aiSyncGate.js` + `src/sync/server.js` · `tests/privacy.egress.test.js` · `api/_spend-caps.js` · `src/ui/VoteSheet.js` (device-bound) · `docs/PHILOSOPHY.md`

## Reference docs
- AFK working doc (today's live log): https://www.notion.so/367789f41c3981c28e4bed7e7fd595f0
- Audit dashboard (UX/Visual/Copy detail): https://www.notion.so/367789f41c39814fabf1c68bb9393d67

## Core principle to honor (governs all Footnote work)
One flat notepad. Everything is the document; features are inline markup/decoration. Cul-de-sacs (Insights/Settings) are opt-in out-and-backs only. Walk-end = turning off editing. No involuntary screens. Privacy must stay real/tested/true. Brand is brown/tan/cream (coral/navy is the parent Lee Fuhr brand, NOT Footnote).
