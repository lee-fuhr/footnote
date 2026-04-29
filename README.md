# Footnote

A walking journal. Open source, offline-first PWA.

---

Walking creates a specific kind of thinking — not quite focused, not quite idle — where connections form that won't form at a desk. Most people lose those thoughts before they get home.

Footnote is built for that window. You open it, you walk, you speak or type. When you get home, your thinking is there — timestamped, GPS-tagged, in a file in your iCloud Drive. Nothing to retrieve. It's just there.

## Free

- One continuous document per walk, always saving
- Speak using Siri or type — both feed the same doc
- No account, nothing stored on a server
- Works without signal
- Notes sync to iCloud Drive automatically — no export step

## Pro — $4.99, one time

- Markdown export
- Richer walk history

## AI — coming soon

An optional subscription. Cleans up what Siri gets wrong. On-device, private.

---

No save button. No entry management. No counts, no pace, no gamification.

The app is a PWA. That's intentional — it asks less of your device and more of your attention. A native iOS app is in the works.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Add to home screen on iOS for the full experience.

```bash
npm test         # Vitest
npm run build    # Production build
```

## Tech

Vanilla JS, Vite, IndexedDB. No framework, no server, no accounts. Hosted on Vercel.

## Roadmap

[footnote-tan.vercel.app/roadmap](https://footnote-tan.vercel.app/roadmap) — Phase 0 is shipped. Phase 1 is next.

## Contributing

Open an issue. PRs welcome. The project is opinionated — changes that add counts, scores, or gamification will be declined on principle.

## License

MIT
