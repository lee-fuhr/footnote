# Footnote roadmap plan

*Synthesized 2026-04-28. Architectural direction: View A (flat-doc). External review: DeepSeek (single voice — Groq 429, Gemini quota-exhausted, Ollama paused at synthesis time). Lee's call confirmed before writing.*

---

## The pivot

The current model (discrete time-stamped entries) is creating the feeling that your words might not be saved. That's not a UI bug — it's the architecture. Replacing it with one flat document per walk that always saves dissolves most of the first-walk findings as side effects.

**North star for the next 2 weeks:** You start a walk. Mic turns on. You speak. Text appears. You walk home. You have a document. Nothing to tap, nothing to save.

---

## Phase 0 — Flat-doc + voice-first MVP (2 weeks, tight scope)

**The one-sentence test:** Lee walks, speaks, walks home, reads a document. If that doesn't work cleanly, Phase 0 isn't done.

**What ships:**
- One continuous document per walk (replaces discrete entries). Auto-saves on every keystroke — no save button, no enter-key ambiguity.
- Mic on by default when a walk is active. Voice transcription appends to the document in real time. No mic toggle during the walk.
- "End walk" tap button (honest and simple). Auto-detection comes later if the tap turns out to be a problem.
- Grammarly fix on the input field (5-minute fix, goes in with everything else).

**What does NOT ship in Phase 0:** Margin timestamps, Tally submission form, GPS metadata overlay. Those go to Phase 0.5 once the core walk works.

**First walk migration:** The 2026-04-28 walk (the one that triggered all of this) stays intact as a legacy session in the old format. It's not migrated — it's preserved. All future walks use the new flat-doc model.

**Roadmap mechanics:** Notion board. Lee adds items from the walk notes queue. Tally form and public submissions are Phase 0.5.

---

## Phase 1 — Trust + navigation (after first walks on the new model)

Validate that flat-doc actually fixed what it promised. Then:

- **B1 (URL bar `**` bug):** May auto-resolve if the new doc doesn't render markdown `**` tokens in a way iOS Safari can grab. If not, investigate and fix the markdown-in-URL leak.
- **Back navigation:** Simplified — session list is always accessible from the header.
- **Walk-end UX:** Informed by how Phase 0 walks actually feel. Is the tap-to-end button getting used, forgotten, or resented?
- **Better STT research (A1):** Siri quality was bad. Evaluate on-device Whisper, third-party API options, Apple Intelligence STT timeline for PWAs. Decision gate before Phase 2.

---

## Phase 2 — Voice-first walking (after STT decision)

- AirPods integration (H2): voice control without phone in hand
- Apple Health mindful minutes (H3): low-effort, philosophy-aligned
- Improved STT based on Phase 1 research

---

## Phase 3 — Deferred until voice-only is loved by real users

- AI thought prompts (A3, AI Pack)
- Two-person walk mode (M2) + consent flow (A4)
- Apple Intelligence on-device summaries (H4)

---

## North star (1+ year, no phase)

- Apple Watch standalone (H1)
- Exercise/pace overlay (M1, opt-in only, honors "no counts" rule)

---

## Dropped

- Roadmap voting built into the app (Notion board instead until 100+ walkers)
- Apple Watch in any near-term phase

---

## Pending before Phase 0 starts

- **Pricing variant cleanup:** pricing-a.html, pricing-b.html, pricing-c.html are in /public/ and are deploy hazards. Delete before next deploy.
- **Hero sentence on pricing.html:** Still unresolved. The four variants were compared in-browser but no pick was made. Needs a decision.
- **C placements ("prefer X?" alt-paths):** Approved copy waiting. Build into about.html and pricing.html once hero sentence is resolved.
