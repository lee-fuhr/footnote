# Plan critique — DeepSeek pass

Adversarial review of the proposed phased roadmap for the first-walk findings.
Saved 2026-04-28 mid-session for resume.

---

## Headline takeaways

1. **Roadmap voting mechanics are premature** — 1 founder, 1 user. Don't build a community governance feature for a community that doesn't exist. Use a Notion page until 100+ active users.

2. **S1 (flat doc vs discrete entries) is over-elevated** — it's a hypothesis, not a binary architectural decision. Pick flat doc *today*, ship in 2 weeks, decide based on real walks.

3. **Several "bugs" are downstream symptoms of the discrete-entry architecture, not bugs:**
   - B3 (enter key) is a symptom of "is there a save?" — flat doc kills it
   - B4 (back nav) is a symptom of "session list" — flat doc removes the need
   - B1 + B2 + B3 collectively read as "users don't trust the app with their words" — architectural, not UI

4. **Apple Watch (H1) is wildly over-prioritized** — Lee's walk was on his phone, and the phone experience isn't voice-first yet. Don't build a Watch app to escape a phone problem you haven't fixed.

5. **Highest-leverage 2-week move:** ship a flat-doc voice-only PWA. No save button, no mic toggle, no text field, no discrete entries. One continuous transcript with timestamps. Walk, speak, return, read.
   - Kills B1, B2, B3, B4, U1, U2 in one move
   - Answers S1 empirically
   - Skips Phases 2-5 debate
   - Validates the "voice-first walking" north star

6. **Drop until validated:** roadmap voting, AI Pack features, Apple Watch, modes (exercise / two-person), thought prompts.

7. **Missing observation:** walk-end detection. Lee's notes never describe HOW the walk ended. If user has to tap "end," the app failed the pocket test.

---

## Full critique

(Verbatim DeepSeek output, kept for reference.)

```
Here is the adversarial critique. I will assume the role of a skeptical, experienced product strategist who has seen founders waste months on "Phase 0" soul-searching while users bleed out from paper cuts.

### 1. Phasing is wrong: You have buried the core value prop under infrastructure

Phase 1 (Bugs + U1) is correct. But Phase 2 (Roadmap mechanics) is a distraction dressed as dependency. You are building a voting system for a product that currently has 1 user (Lee) and a handful of bugs. This is premature optimization for community governance.

Fixed phase order:
- Phase 0: S1 + A2 (Voice-only mode). If S1 = flat doc, voice mode becomes trivial. If S1 = discrete, voice mode requires a complex state machine. Decide S1, then immediately prototype voice-only dictation. This kills B3 (save anxiety) and U1 (mic toggle).
- Phase 1: Bugs + U1 — same, but framed as "fix trust after we shipped voice mode."
- Phase 2 (NEW): S1's marginal metadata challenge. Don't decide theoretically. Ship flat doc without GPS. See if anyone misses it. If nobody complains after 100 walks, the trade-off was worth it.
- Phase 3: A1 + H2 + H1 (voice-first walking north star). This is your moat, not Apple Watch standalone.
- Phase 4: Modes + A3 + A4. Last to build because two-person walk requires consent flow which requires STT trust which requires voice interface.

Roadmap mechanics should be Phase 5 or a free Notion board.

### 2. S1 is a hypothesis, not a Phase 0 decision

Pick flat doc today. Flat-doc → discrete is a one-sprint migration. Discrete → flat is harder. The privacy model also favors flat doc — single JSON blob + audio files vs relational schema.

### 3. Miscategorizations

- B3 not a bug — symptom of discrete-entry architecture
- B4 not a bug — only exists because session list exists
- U1 not micro-friction — voice interface design flaw, the mic should never need re-tapping
- H1 wildly over-prioritized — phone isn't voice-first yet, demote to "maybe never"

### 4. Missing observations

- The trust pattern: B1+B2+B3 all signal users don't trust the app with their words
- A3 is a distraction until voice mode works
- Walk-end detection — how did Lee's walk end? Not in classification at all

### 5. Next 2 weeks

Ship flat-doc voice-only PWA. No save button, no mic toggle, no discrete entries. Lee walks again, speaks 18 observations, walks home, sees one continuous transcript with timestamps.

### 6. Roadmap mechanics is 10× overengineered

You have 1 founder. Use Notion + Twitter. Don't build community infrastructure.

### 7. S1 reframe

Real question: "Do we trust that a flat doc with marginal metadata is good enough for the first 500 walks?" Yes. Marginal metadata is additive. Discrete entries require schema change.

Summary:
- Ship flat doc + voice-only in 2 weeks
- Drop roadmap voting, modes, Apple Watch
- Classify "bugs" as architectural symptoms, not individual fixes
- Add "walk end detection" as Phase 1 critical path
- No AI Pack until voice-only is loved by 10 users
```
