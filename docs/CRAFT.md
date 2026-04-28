# Footnote craft brief

Source: Terry Godier — terrygodier.com. Lee resonated deeply with two pages and asked Footnote to draw on their DNA for years to come. Brief synthesized via DeepSeek 2026-04-24.

References:
- Essay: https://www.terrygodier.com/the-last-quiet-thing
- Product page: https://www.terrygodier.com/current

---

## 1. Voice patterns

**Sentence rhythm:** Short declarative sentences that land like observations, not conclusions. Then a longer sentence that unfolds the thought. Repeats. He writes *around* an idea before naming it.

> "I started building Current before I had the words for why."
> "The impulse was simpler than a philosophy."

**Vocabulary:** Concrete nouns over abstractions ("river," "items," "feeds"). Language of sensation ("made me feel bad"). Words suggesting slowness without saying slow ("stillness," "quiet," "river"). Coins terms rather than borrowing ("phantom obligation").

**What he avoids:** industry jargon (productivity, inbox zero, workflow), enthusiasm markers (no exclamation points), em dashes, second-person commands (you should, you need to), markers of speed (on the go, seamless, optimized).

**Signature move:** Naming the thing everyone feels but hasn't articulated. Then showing he built against it.

## 2. Emotional arc

**Essay:** Unease laced with recognition. Awe → dread. The Casio F-91W illustration isn't nostalgic — it's ominous. Your possessions are alive and won't shut up. *I knew this, but I didn't want to say it out loud.*

**Current:** Relief and permission. Unnamed friction → named diagnosis ("phantom obligation") → built alternative. *Someone else felt this too, and they built a door out.*

**How:** Both open with the absence of a position ("before I had the words"). Both delay naming the antagonist. Both resolve by showing rather than arguing.

## 3. Design moves (inferred from CSS)

**Palette:** Background `#0e1518` / `#0e1314` (warm-black). Text `#d4c8b8` / `#a89f91` / `#e8dfd1` (parchment, stone, cream). Accent `#4a7c7c` muted teal — only for links, sparingly.

**Typography:** Geist (custom sans) for UI. Georgia/Times for body on the essay page. No font weights above 300. Tracking pushed wide: `0.15em` headlines, `0.3em` small caps.

**Whitespace:** Massive padding (`py-32`). Compression in the hero ("847 unread" at 22vw). Breathing in body (28px paragraph margins). Scroll-hint is a quiet animated circle, not a button.

**Texture:** Noise overlay at `opacity:0.07` with `mix-blend-mode:overlay`. Analog feel on a digital page.

## 4. Attention-to-detail tells

1. **"Prefer stillness? read as plain text"** — emotional framing, not functional. ASCII bullet `○`.
2. **The Casio F-91W illustration** — fully hand-coded SVG/CSS, including DSEG7 monospace, gradient reflections, AM indicator, ghost digits. Watch face background `#dededc` — exactly the cream of an old LCD.
3. **Scroll-hint** — bouncing circle that fades on scroll.
4. **Hero number 847** — not 0, not 10,000. An unremarkable lived-in number from a real reader.
5. **"This is Current."** — set in the same font weight as the hero. A whisper, not a headline.
6. **Link underlines** — `text-decoration-color:#4a7c7c40` (40% opacity), `text-underline-offset:3px`. Barely there. Trusts you to notice.
7. **App icon shadow** — `0 16px 48px rgba(0,0,0,0.6), 0 0 30px rgba(74,124,124,0.06)`. The 6% teal glow is almost imperceptible.
8. **No copyright footer.** No "made by." No newsletter signup. Trusts the work to stand without scaffolding.

## 5. Positioning / enemy frame

**Essay:** Enemy is the smart home / IoT — not as tech but as a philosophy where everything should speak. *"Your possessions came alive. Now they won't stop talking."*

**Current:** Enemy is the unread count — not as UI but as a psychological contract. *"I just knew I wanted a reader that didn't make me feel like I owed it something."*

**Combined:** The transformation of leisure into obligation by invisible design conventions. One attacks the smart home. The other attacks the inbox. Both attack the same thing.

## 6. What to adopt in Footnote

1. **Quiet framing.** Footnote = the place where walking notes go to be still. Containers, not pipelines. "A journal" not "a tracker."
2. **Illustrated hero.** Not a screenshot. A hand-coded rendering of the app's core artifact — open notebook with tape, or shoes at a doorstep. The Casio took hours. That level of care communicates the thesis.
3. **"Prefer stillness?" alternative paths.** A button that reads "prefer to write by hand?" or "need a prompt?". Frame every alternative as a preference, not a feature.
4. **Noise overlay.** Subtle CSS grain or scan-line. Signals "this is a crafted space" without saying it.
5. **No demands on scroll.** Page doesn't ask you to do anything at the bottom. No "sign up," no "read more," no "share." Landing should end in the same silence.
6. **No counts anywhere.** Never "3 entries today" or "7-day streak." If users want to count, let them scroll.
7. **Delay the thesis.** Open with the *feeling* you wanted to create, not the feature list. Let the user discover the why through use.
8. **Single-accent-color.** Pick one (muted ochre or deep green) used *only* for links and the rarest highlights. Color earns meaning through scarcity.
9. **Serif for long-form, sans for UI.** Tells the reader "this is the part where you rest."
10. **Name a feeling.** Terry coined "phantom obligation." Footnote could coin "threshold drift" (the distance before your mind quiets) or "anchor note" (the first thing you write when you stop). Named experience = shared experience.

## 7. What NOT to adopt

1. **Dark backgrounds.** Footnote is used in daylight. Use his cream tones as *background*, not text. Warm paper, dark ink.
2. **Extralight font weights.** Outdoor + motion = legibility risk. Use his tracking and color but at normal/medium weight.
3. **Persistent canvas noise at 60% opacity.** Battery + render cost on mobile PWA. Use a static SVG/CSS texture. Effect translates, technique doesn't.
4. **Casio illustration aesthetic.** Retro tech is right for RSS. For Footnote, reference analog writing tools — field notes, pocket notebooks, train tickets, receipt paper, maps. Same craft ethos, different vocabulary.
5. **Serif body text on mobile.** Beautiful in browsers. Risky for walking + outdoor. Use a warm round sans (Satoshi or softened Geist) for body.
6. **Scroll-driven hero transitions.** Current's 200vh hero works for an essay. Footnote's landing should be concise and inviting. Borrow the *single hero with fade-in* (essay page) rather than the scroll transition (Current page).
7. **No explicit CTA.** Current can get away with no install button because it's a marketing page for a future app. Footnote's PWA needs a gentle installation invitation — but quiet. Small text link in warm gray. "Footnote works best as an app → [install instructions]" — same tone as the scroll hint.

---

*Refresh this brief when Terry ships new work, or every 6 months. Keep close.*
