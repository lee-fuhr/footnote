# Walk findings — field notes from real walks

Append-only log of what Lee notices using Footnote on actual walks. Each entry: date, observation, type, and current status. When the founder-add roadmap pipeline (Phase 1) is built, items get migrated into proper roadmap entries with voting. Until then this is the queue.

---

## 2026-04-28 — first walk (nature trail behind house, 10:53–11:12 AM)

### Bugs

**B1. URL bar gets `**` appended during text selection / copy**
- Severity: high. User mental model became "I touched the data and lost it." For a journal app whose pitch is "your words are safe," that's the worst possible feeling.
- Repro: open a walk session in Safari iOS PWA → Select All → Copy. URL bar acquires trailing `**`, Safari then attempts to navigate and fails ("server can't be found").
- Hypothesis: Markdown bold tokens (`**Started:**`, `**Duration:**`) in the rendered session view are leaking into a URL handler somewhere, or iOS Safari is interpreting the selected markdown as a navigable target.
- Status: open. Investigate first.

**B2. Grammarly artifact appearing on input field**
- Severity: medium. Distracting, signals "uncrafted." Should never appear.
- Fix: add `data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"` on the contenteditable element. Five-minute fix.
- Status: open.

**B3. Enter key behavior inconsistent**
- Severity: high. Sometimes adds a line break, sometimes saves the memory. User can't predict, ends up in "limbo state" not knowing if what they wrote is saved.
- This is a trust-killer. Tied directly to the bigger strategic question below (S1).
- Status: open. Decision needed: pick a deterministic behavior and document it on the input.

**B4. No back-navigation from open walk to session list**
- Severity: medium. Affects every walk. Lee found himself stuck in the open session view with no way back.
- Fix: add a back button or breadcrumb in the walk-detail view header.
- Status: open.

### Micro-friction

**U1. Mic toggle and text-field focus require constant tapping**
- During an active walk, the mic state and input focus get lost between entries. User has to tap repeatedly to keep recording or typing.
- Proposed: while a walk is active, lock focus into the input field and keep mic state sticky between entries.
- Status: open.

**U2. Placeholder copy in input field could be more interesting**
- Current copy is generic. Could land as an invitation rather than a label.
- Lee linked this to the future AI Pack idea: "thought prompts" (rotating, gentle nudges).
- Status: open. Easy to ship a single better placeholder now; rotating prompts is a Pro/AI Pack feature.

### Hardware integration (Apple ecosystem)

**H1. Apple Watch companion app — ideally standalone**
- Strategic. Aligns directly with the philosophy ("the app should feel like a pocket, not a tool"). Walking with phone OUT means phone is the tool. Walking with watch only means the device disappears.
- Big lift. Likely a year of work for full standalone.
- Status: north-star, not Day 1.

**H2. AirPods integration**
- Voice control without phone in hand. Pairs with voice-only interface mode (A2).
- Status: open.

**H3. Apple Health — record walks as mindful minutes (optional)**
- Easy integration. Honors the philosophy by making the walk count toward something the user already cares about, without making the count the point.
- Status: low-effort win.

**H4. Apple Intelligence — on-device summaries**
- Privacy-aligned (on-device). Could power Coda, Echo, or both without sending text to a third-party.
- Status: research; depends on Apple Intelligence API availability for PWAs.

### AI / language

**A1. Better speech-to-text than Siri**
- Siri quality during the walk was "terrible." Limits the voice interface ceiling.
- Options: on-device Whisper, third-party API, Apple Intelligence STT when available.
- Status: research.

**A2. Voice-only interface mode**
- "Allow user to use only voice as the interface — simple commands, no taps." Job-to-be-done: "go for a walk and record my thoughts reliably without using anything but my voice."
- Strategic. Pairs with H2 (AirPods) and A1 (better STT).
- Status: north-star companion to H1.

**A3. Thought prompts (AI Pack feature)**
- Rotating, optional prompts that surface when the input is empty or the user pauses too long. Anti-blank-page.
- Status: roadmap, AI Pack.

**A4. Granola-style consent flow for recording other people**
- If two-person walk mode (M2) ships, consent capture for the other walker matters.
- Reference: Granola does this for meeting recordings.
- Status: ties to M2.

### Modes

**M1. Exercise mode — optional distance/pace overlay**
- For walks where the user wants both reflection AND a workout signal.
- Status: open. Has to honor "no counts" rule unless explicitly turned on.

**M2. Two-person walk mode**
- Designed for walks where two people discuss ideas. Different UX from solo: maybe shared session, both contribute, consent flow (A4) front-loaded.
- Status: open. Strong differentiator.

### Strategic / data model

**S1. Should a walk be one flat text document with margin metadata, instead of discrete time-stamped entries?**
- Lee's strongest articulation: *"I think I don't want to present this as a series of individual text entries on a walk, so much as one big TextEdit-style flat text document, and in the background we are recording times and pin locations and whatever other metadata, that we can then overlay onto the text in some way. Maybe it's just a right margin with small timestamps and you tap on them, also see a location map."*
- Why this is the question: every UX decision below sits downstream. The discrete-entry model creates the "did I save this?" limbo (B3). The flat-doc model dissolves it because there's only one document, always saving.
- Trade-offs:
  - Flat-doc: feels familiar (like Notes), removes save anxiety, harder to do per-line GPS/timestamps cleanly, harder to do Coda card review (currently per-entry)
  - Discrete entries: clean metadata model, supports Coda, cleanly time-stamped, but creates the "is this saved?" friction
- Edge cases Lee flagged: editing past text, where margin metadata goes after the user changes content
- Status: **decide before any feature work**. This is foundational.

**S2. Why even save multiple discrete memories within a single walk?**
- Same question as S1, asked from the other side.
- If S1 resolves to flat-doc, S2 resolves itself.

---

## Voice / framing material captured (not action items)

> "I like this app as part of a movement of trying to figure out how to use modern capabilities and modern devices in a more responsible way for our well-being. As much as this is a screen, I'm trying to use it as a tool to help people be more present in their environment, and mindful with their thoughts."
> — Lee, 10:56 AM, first walk

Possible uses: about page positioning, philosophy doc revision, future LinkedIn post when launching publicly. Don't ship verbatim without voice-pass.

---
