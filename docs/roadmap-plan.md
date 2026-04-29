# Footnote roadmap

*Live board: [footnote-tan.vercel.app/roadmap](https://footnote-tan.vercel.app/roadmap). This doc is the narrative behind the phases — the "why" that the board doesn't show.*

---

## How phases work

Each phase has a single gate question. You don't advance until that question is answered yes.

| Phase | Gate question |
|-------|---------------|
| 0 | Does the basic walk loop work? |
| 0.5 | Does it work on an actual walk in the field? |
| 1 | Would I use this every day? |
| 2 | Can I share this with 10 people I know? |
| 3 | Can I share this with strangers? |
| 4 | Is voice so good that phone-in-pocket is the primary mode? |
| Someday | Is there a real user base to build this for? |

---

## Phase 0 — Core walk built ✓

**Gate:** Does the basic walk loop work?

The flat-doc architecture. One document per walk, auto-saves on every keystroke. Voice and keyboard both append to the same doc. Walk-end button. Grammarly disabled. Empty state copy. Everything deploys.

---

## Phase 0.5 — Field-tested ✓

**Gate:** Does it work on an actual walk in the field?

The gap between "works on localhost" and "works in your pocket on a street." Screen stays on during dictation (wakelock). Words are safe the instant Siri commits them (compositionend save). Phone lock flushes to disk (visibilitychange). Debounce cut to 100ms. iCloud master journal file — your notes are in iCloud when you get home, no export step. Slow transitions — the app moves at a different pace than everything else.

---

## Phase 1 — Daily driver ✓

**Gate:** Would I use this every day?

Fixes that matter once you're a regular user. Back navigation. URL bar bug (Siri grabbing `**` markdown as a selection). STT quality research — understanding the landscape before committing to a direction. The walk experience is now good enough to be a habit.

---

## Phase 2 — Ready for friends

**Gate:** Can I share this with 10 people I know?

This is the trust-building phase. Before sharing with anyone, three questions need a yes: Is it provably private? Do users know where their notes live? Is the experience smooth enough that it reflects well?

- **Security audit** — network monitor proof that nothing leaves the phone. The privacy promise is the product's strongest differentiator. It needs to be verifiable, not just claimed.
- **Settings / admin UI** — show users what iCloud folder their notes live in, link directly to Files, let them change location. The framing is not "export" — notes are always there. Settings is visibility and control.
- **Basic telemetry** — aggregate only (hours, notes, walks). Gives real numbers for launch conversations and future App Store copy.
- **Gap-based auto-close** — 90-minute inactivity ends the walk automatically. Removes the end-walk button as a required step. Walk home, done.
- **Resume UX** — returning to an active walk restores cleanly, cursor at end.
- **iPhone Action Button** — Shortcuts integration for zero-tap start on supported hardware.

---

## Phase 3 — Public launch

**Gate:** Can I share this with strangers?

The Slack-post phase. The broader bureau. ProductHunt if it makes sense. What's needed: the experience is polished enough for people who have no relationship with the builder, the privacy story is proven, and there's a clear path to Pro revenue.

- App Store listing (if/when PWA → native submission)
- Better STT — based on Phase 1 research decision: on-device Whisper, third-party API, or Apple Intelligence
- Polished walk history and journal view
- Pro tier active and working ($4.99, one time)
- Messaging framework fully applied to all surfaces

---

## Phase 4 — Voice-first

**Gate:** Is voice so good that phone-in-pocket is the primary mode?

After real users validate the core walk experience, go deeper on hands-free walking. These features don't matter until the basic loop is loved.

- **AirPods integration** — voice control without phone in hand
- **iPhone Action Button** — if not already in Phase 2, deepen the integration
- **Apple Health mindful minutes** — low-effort, philosophy-aligned
- **Improved STT** — whatever the Phase 1 research pointed to

---

## Someday

Features that require a real user base to design for, or that depend on platform availability that doesn't exist yet.

- Apple Watch standalone
- AI thought prompts
- Two-person walk mode with consent flow
- Apple Intelligence on-device summaries
- Exercise / pace overlay (opt-in only, honors "no counts" rule)

---

## Dropped

- Roadmap voting built into the app — GitHub Projects instead, until there are 100+ walkers
