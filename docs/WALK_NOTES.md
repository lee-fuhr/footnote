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

## 2026-04-29 — second walk (neighborhood, ~10:35–10:49 AM)

### Bugs

**B5. Phone locks mid-dictation, kills Siri session**
- Severity: high. Phone locked while Lee was mid-note via Siri. Fell out of dictation, had to restart. Content state unclear.
- Fix needed: `navigator.wakeLock.request('screen')` while a walk session is active. Release on session end or app background.
- Status: open. Fix ready to ship.

**B6. Cursor lands mid-text on re-focus**
- Severity: high. After hitting checkmark (keyboard dismiss), tapping the note to re-enter puts cursor wherever you tapped — middle of existing text. User has to carefully tap the very end to resume dictating. In bright light, moving, hands full, this is a real barrier.
- Fix: on `focus` event, move cursor to end (`textarea.setSelectionRange(len, len)`).
- Status: open. One-liner fix.

**B7. Debounce save unreliable for Siri dictation**
- Severity: high. Current save fires 500ms after last `input` event. Two failure modes: (1) phone locks before 500ms elapses — timer never fires, content lost; (2) Siri commits text to the field as a batch event, then user hits checkmark — the app may not register a standard `input` event from Siri's commit, so debounce never starts.
- Fix: also save on `blur` (keyboard dismiss) and `visibilitychange` (app goes to background).
- Status: open. Fix ready to ship alongside B5 and B6.

### UX / micro-friction

**U3. Checkmark dismiss creates re-entry friction**
- Hitting the iOS keyboard checkmark closes the keyboard. Getting back in requires tapping — and then B6 (cursor mid-text) compounds it. The checkmark is a friction trap for voice users.
- Longer-term: consider whether the keyboard should auto-dismiss and re-focus between Siri utterances, or whether the input should stay active throughout.
- Status: open.

### Hardware / platform

**H5. iPhone Action Button as walk start/stop**
- One physical button, one dedicated action. Exact analog to the micro tape recorder (one button to record, one to stop). Zero screen interaction needed.
- Feasibility: PWAs can register Shortcuts that fire Action Button via iOS Shortcuts app. Not native API access, but achievable without App Store.
- Status: research. High potential for the zero-friction goal.

### Product / strategic

**P1. Zero friction is the whole product**
- "I just start my walk, tap once, and for the rest of the walk I have zero friction to keep taking notes." Everything that violates this is a bug, even if it works technically.
- Analog: the micro tape recorder. One button. No interface. The device disappears.
- Status: design principle. Test every decision against it.

**P2. Tagline candidates**
- "For people who think on their feet"
- "For people who think best on their feet"
- Status: hold. Don't ship without messaging framework (see P4).

**P3. Design language — slow and gentle**
- Very slow transitions, faded animations — slower than typical apps in this space.
- Not an aesthetic choice: it's a signal. The app should feel like it helps you slow down, quiet your mind, get more gentle with yourself.
- Status: design principle. Apply to all animation work.

**P4. Messaging framework + JTBD needed before wider launch**
- Lee flagged: no JTBD framing exists yet. Need jobs-to-be-done to keep the build honest and focused.
- Status: pre-bureau-launch gate.

**P5. Basic telemetry before public launch**
- Need to be able to say: "X hours logged, Y notes taken, Z miles walked."
- Privacy-aligned: aggregate only, never individual content.
- Status: pre-wider-launch gate.

**P6. Security audit before sharing wider than the bureau**
- Goal: someone running a network monitor should find nothing they weren't already told about.
- Proof points: nothing leaves the phone, minimal collection evident in the UI.
- Status: pre-bureau-launch gate.

**P7. "No AI" as a pro tier bullet**
- The last line of the pro tier feature list is literally "no AI."
- Signals trust, privacy, intentionality. Unusual enough to be a differentiator.
- Status: roadmap. Hold for pricing/tier work.

**P8. iCloud sync as the privacy-aligned export solution**
- Always-on background sync to a marked-up `.md` file (or multiple files) in iCloud Drive.
- Solves three problems simultaneously: (1) export without a button, (2) backup, (3) proof that data stays in the Apple ecosystem.
- Tagline-able: "your notes live in iCloud, not on our servers."
- Status: strong candidate for Phase 1 or AI Pack. Investigate iCloud Drive API for PWAs.

---

## 2026-05-05 — third walk (neighborhood, ~8:31–8:43 AM)

**Note:** Notes were captured locally but not synced to the server before iOS suspended the PWA. Content recovered from Lee's manual export. Root cause fixed: server sync reduced from 60s → 10s, blur-save added.

### UX / friction

**U4. Keyboard doesn't open on walk start — must tap input field manually**
- Severity: high. Lee taps "start walk" and the keyboard stays hidden. Zero-friction goal requires the keyboard (and Siri dictation) to be available immediately.
- Currently: walk starts on textarea focus, but that focus happens AFTER async session setup, which loses the iOS keyboard permission.
- Fix direction: investigate autofocus on walk start; may require restructuring the start flow to keep the user gesture on the textarea focus.
- Status: open. Needs investigation.

**U5. Pulsating dot in lower-right corner — unclear**
- Severity: medium. There's a pulsing dot (voice indicator) whose meaning is not obvious. Lee asked "what is that pulsating dot?"
- It is not tappable and has no tooltip.
- Fix shipped: converted from `<span>` to `<button>` with `title="Voice recording active — tap to stop"`. Tapping it stops voice and returns focus to the textarea.
- Status: shipped (this session).

**U6. GPS shows only N latitude — no E/W longitude**
- Severity: low. Lee noticed the coordinate only shows `32.791°N` — no longitude.
- Fix shipped: added longitude (`32.791°N 117.123°W`).
- Status: shipped (this session).

**U7. Two pulsating dots in footer — confusing**
- Severity: medium. GPS indicator (always visible when live) + voice indicator (when active) = two pulsing elements with no clear distinction.
- Users can't tell which is which.
- Fix direction: visual differentiation (different shape, color, or label) between GPS dot and voice dot.
- Status: open. Partial fix via U5 (voice dot now has tooltip and is a button).

---

## Voice / framing material captured (not action items)

> "I like this app as part of a movement of trying to figure out how to use modern capabilities and modern devices in a more responsible way for our well-being. As much as this is a screen, I'm trying to use it as a tool to help people be more present in their environment, and mindful with their thoughts."
> — Lee, 10:56 AM, first walk

Possible uses: about page positioning, philosophy doc revision, future LinkedIn post when launching publicly. Don't ship verbatim without voice-pass.

---
