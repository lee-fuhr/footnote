# Walk notes app — product spec

**Version:** 1.0  
**Date:** 2026-04-23  
**Status:** Awaiting Lee approval  
**Produced by:** Convergence plan audit (Groq + DeepSeek adversarial + Bible §1/§4/§6 + Lee interview)

---

## 1. Core value proposition

Walk Notes captures each thought exactly where and when you had it — automatically — so you never lose the context that makes an idea actionable.

---

## 2. Target user

**Primary (dog food):** Lee Fuhr — brand strategist who processes work problems on walks. Currently uses Siri + Apple Notes, frustrated by the manual overhead of organizing, dating, and locating notes after the fact. Wants the walk itself to be a first-class creative session.

**Secondary:** Knowledge workers and solo entrepreneurs who use walks as thinking sessions. They pay for tools that save mental overhead (Readwise, Notion, Obsidian). They don't need the geo feature explained — they feel the friction immediately when they try Apple Notes on a walk.

---

## 3. MVP feature list (no AI, no integrations)

These are the only things that ship first. Everything else is a later version or a kill.

- **PWA (Progressive Web App)** — installable on home screen, no App Store
- **Wizard onboarding:** mic permission (optional, dictation) + location permission (hi/lo fidelity, user's choice)
- **Text input:** each line auto-tagged with timestamp + GPS coordinates on save
- **Voice dictation (optional):** Web Speech API → text → auto-timestamped line
- **Session model:** tap to start a walk session, tap to end it; each session is a named unit
- **Local-first storage:** IndexedDB, offline-first, no server, user owns their data
- **View + search past sessions:** by date, keyword, or location proximity
- **Basic export:** Markdown download and plain text download — this is not optional for V1

**What is explicitly NOT in MVP:**
- Notion / Apple Notes / Obsidian sync (delayed until 50+ paying users validate the core)
- AI summarization or enrichment
- AllTrails integration or Google Maps photo enrichment
- Social or sharing features
- Any server-side storage or accounts

---

## 4. V2 feature list (AI pack + first integration)

### AI pack (waitlisted at launch, built in V2)

The waitlist is the demand signal. Build only after 100+ waitlist signups.

- Summarization (walk → key ideas)
- Next big idea extraction
- Project identification and organization
- Voice transcription enhancement (better than Web Speech API)

### First integration (user vote at launch, built in V2)

- Export to Notion (most likely winner — developer-friendly API)
- Export to Apple Notes (second choice — AppleScript/share sheet)
- Export to Obsidian (third — local vault file drop)

### V2 backlog (not V2 unless demand confirmed)

- AllTrails / Google Maps enrichment (§6.2 risk — build only after core is validated)
- Geo-clustering of related ideas
- Walk stats (distance, time, idea density)

---

## 5. Business model

| Item | Decision | Rationale |
|------|----------|-----------|
| One-time price | **$7.99** | $3.99 signals toy (🔀 DeepSeek); $7.99 is still impulse, doubles margin |
| Update window | **1 year** | Reasonable expectation-setting; re-purchase if still using |
| AI pack | **$4.99–6.99/month** | Waitlisted at launch; build only after demand confirmed |
| Hosting | **Free tier (Vercel/Cloudflare Pages)** | Zero server cost; local-first means no database to host |
| Distribution | **Direct web, no App Store** | No 30% cut, no approval process, consistent with PWA approach |

---

## 6. Checkpoint gate (Bible §1.7 — mandatory)

This is the kill signal. Define it before writing a line of code.

| Gate | Metric | Date | Failure response |
|------|--------|------|-----------------|
| Habit | Average user opens on 3+ walks in first 30 days | 30 days after launch | Revisit core mechanic; consider pivot to export-only tool |
| Revenue | 50 paying users | 90 days after launch | Kill or open-source; don't invest in V2 |
| AI demand | 100+ AI pack waitlist signups | At launch | Delay AI pack build; reassess at 90-day gate |

---

## 7. Biggest unresolved question

**Does the habit form?**

The geo+timestamp feature is technically correct but behaviorally unproven. The product only has value if people actually walk with it open. Siri + Apple Notes is clunky — but is the clunkiness the actual blocker, or is the real problem that capturing ideas on walks isn't a habit most people have?

This question cannot be answered by building. It can only be answered by 30 days of data from real users. The MVP must include: session start events, note counts per session, and return rate (did they come back for a second walk?).

---

## 8. Name candidates

| Name | Rationale |
|------|-----------|
| **Waypoint** | Geo metaphor; "here's where I was"; clean, single word; domain likely available |
| **Notewalk** | Literal; says exactly what it does; SEO-friendly; not premium-feeling |
| **Pinstep** | Geo-pin + step; names the mechanic directly; memorable; unusual |
| **Stride** | Movement + thinking; modern; but too generic — fitness apps own it |
| **Meridian** | Navigation / position; sophisticated; but obscure and hard to spell |

**Recommended starting point for testing:** Waypoint or Pinstep — both name the mechanic without sounding like a generic notes app.

---

## 9. Technical constraint (non-negotiable for architecture)

**iOS Safari background behavior is the #1 build constraint.**

The following will kill the product if not designed around from day one:

1. **Audio recording dies when screen locks** — iOS suspends background tabs after ~30 seconds. Mitigation: auto-save audio blobs every 5 seconds to IndexedDB; prompt user to keep screen awake; implement wakeLock API where supported.
2. **GPS stops updating when tab is backgrounded** — `watchPosition` stops firing. Mitigation: require GPS lock before session start; store last known coordinates; mark location as "last seen at" when backgrounded.
3. **IndexedDB gets purged under memory pressure** — iOS caps at ~1 GB and may evict data. Mitigation: warn at 80% quota; prompt export; never rely on IndexedDB as sole backup — trigger sync/export early and often.

**If audio + GPS don't work reliably on iOS Safari while walking, ship text-only MVP first.** Voice dictation becomes V2.

---

## 10. Cross-model adversarial summary

| Source | Concern | Verdict |
|--------|---------|---------|
| 🔀 DeepSeek | "Niche solution to a non-problem" | KILLED — Lee has the problem right now |
| 🔀 DeepSeek | "Maintenance debt will crush solo builder" | SURVIVES as technical risk #1 (iOS Safari constraints) |
| 🔀 DeepSeek | "$3.99 signals cheap toy" | SURVIVES — raise to $7.99 |
| 🔀 Groq | "Location data privacy is category risk" | KILLED — local-first architecture makes privacy a differentiator |
| 🔀 DeepSeek | "AI pack cannibalization / no lock-in" | STEELMANNED — waitlist model is correct; don't build before demand confirmed |
| 🔀 DeepSeek (tech) | iOS audio background death | SURVIVES — design around this from day one |
| 🔀 DeepSeek (tech) | IndexedDB eviction | SURVIVES — export must be V1, not V2 |

---

## 11. Next moves

- **N1:** Lee approves this spec (due 2026-04-25 — Todoist task created)
- **N2:** Prior art search — run `sessions "walk notes PWA geo"` and `sessions "walking notes app"` to check if this idea has been explored in prior sessions
- **N3:** Name domain check — run WHOIS on waypoint.app, pinstep.com, notewalk.app before committing
- **N4:** Bible §4.2 design phase — once approved, spawn Architecture Analyst to draft technical spec with iOS Safari constraints as the forcing function
- **Kill signal check:** Before build begins, confirm checkpoint gates are in a Todoist project with due dates

---

*Audit conducted 2026-04-23. Adversarial inputs: 🔀 Groq (competitive landscape), 🔀 DeepSeek (business model, adversarial, technical risks). Gemini quota exhausted — DeepSeek substituted for adversarial pass. Bible sections read: §1 (Core principles), §4 (Project playbook), §6 (Anti-patterns). ⬆️ Sonnet synthesis.*
