# Foot.Note — project context

## What this is

A PWA purpose-built for walk thinking. Not a GPS app, not a general notes app. The specific use case: the stream-of-consciousness thoughts that walks uniquely foster (bilateral brain stimulation, Jobs/Aristotle/Darwin model). Capture before evaporation.

The pain: "I was dictating into iOS Notes with Siri but my thoughts just evaporated into the ether." Notes app has no concept of a walk as a unit. No structure, no GPS context, no way to find walk thoughts later.

The product: open → write or dictate → walk ends → thoughts are organized, GPS-stamped, searchable. Every friction point removed.

**Brand vocabulary:**
- A session = a **walk** (or eventually "NoteWalk" — "go on a NoteWalk")
- A paragraph = a **note** (a discrete thought)
- The app = **Foot.Note** (always with the period, period is tan in the UI)
- Location auto-detected from GPS (e.g. "Griffith Park") — NOT a "project"
- Projects = user-defined intent, TBD (e.g. "Book ideas", "Product thinking")

## Tech stack

- Vanilla JS + Vite 8
- IndexedDB (3 stores: sessions, lines, metadata)
- vite-plugin-pwa (service worker, offline-first)
- No server, no auth, no backend
- GPS via browser Geolocation API
- EB Garamond + IBM Plex Mono (field journal palette)

## Design system

- Background: `#F7F3EC` (cream)
- Ink: `#1C1814`
- Accent/GPS: `#8B6F47` (saddle tan)
- Muted: `#C4B49A`
- Rule: `#D4C4A8`
- No dark mode (intentional)
- Logo: Streamline "walking-steps" icon, cream on espresso (#2D1E0F) background

## Running the project

```bash
cd /Users/lee/Sites/footnote
npm run dev          # dev server
npx vitest run       # tests (67 tests, 8 files)
npm run build        # production build
vercel --yes --prod  # deploy (needs .npmrc with legacy-peer-deps=true)
```

Live URL: https://footnote-tan.vercel.app

## Key files

- `src/app.js` — boot sequence
- `src/app.css` — all styles (field journal palette)
- `src/ui/Editor.js` — main canvas UX
- `src/ui/SessionList.js` — walk history
- `src/ui/GpsIndicator.js` — GPS status button
- `src/session/manager.js` — session state machine (IDLE→ACTIVE→CLOSING)
- `src/session/state.js` — pure state transitions
- `src/db/index.js` — IndexedDB (sessions, lines, metadata)
- `src/gps/index.js` — GPS watch + staleness detection
- `src/export/share.js` — .md and .txt export

## Architecture decisions

- **No "Start walk" button** — first keystroke or Enter auto-starts session
- **Enter = save paragraph** — each paragraph is a "line" with GPS + timestamp
- **GPS separator** between paragraphs (editorial ruled line + mono time/coords)
- **Pin icon** left of each paragraph — tappable, shows info sheet with exact GPS
- **Gap detection** (30 min) handles walk end when app goes to background
- **Heartbeat** (visibilitychange) preserves session across backgrounding
- **monotonicNow()** prevents same-millisecond timestamp collisions in tests

## Product position

The walk IS the thinking technology. GPS is memory infrastructure, not the product.

Unclaimed position: purpose-built for walk thinking. Day One has location as secondary. Obsidian is knowledge-base-first. Nobody owns "the app for thoughts that only happen when you're moving."

## Roadmap (working)

**Gate 1 (done):** Text-only MVP, GPS-stamped paragraphs, session management, export
**Gate 2:** AI-generated tags + walk summary after walk ends. Reverse-geocoded location names.
**Gate 3:** Map view (Leaflet or MapKit JS). Walk route from waypoints.
**Gate 4:** Capacitor → App Store. $9.99 one-time Pro unlock.
**AI pack:** Whisper transcription, Claude summarization, auto-tags, on-device option (Apple Intelligence).

## Pricing strategy (from research)

- r/macapps strongly prefers one-time purchase over subscription
- Sweet spot: $4.99–$9.99 base, $14.99–$19.99 with Mac companion
- Free tier with real utility; Pro unlock for map view + AI features
- No subscription. Setapp presence viable as additional channel.
- Lead with "you own your walks" not "privacy-first"

## Product docs

See `_product/` for research, competitive analysis, and positioning.
