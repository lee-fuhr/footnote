# Foot.Note

A walking journal. Open source, offline-first PWA.

---

You go for a walk. Thoughts show up. You speak or type. You walk home. You have a document.

That's it.

Foot.Note is built on the idea that walking produces a specific kind of thinking — the kind Jobs, Aristotle, and Darwin swore by. The app shouldn't get in the way of that. No save button. No entry management. One continuous document per walk, always saving.

## What it is

- **Offline-first PWA** — works without internet, no account required
- **Flat-doc architecture** — one document per walk, auto-saves on every keystroke
- **Voice + text** — speak or type, both feed the same document
- **Export anywhere** — walks export as clean Markdown or plain text
- **No counts** — no steps, no pace, no gamification

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Add to home screen on iOS for the full PWA experience.

```bash
npm test         # Vitest
npm run build    # Production build
```

## Tech

Vanilla JS, Vite, IndexedDB. No framework, no server, no accounts. Hosted on Vercel.

## Roadmap

The public roadmap lives at [github.com/users/lee-fuhr/projects/4](https://github.com/users/lee-fuhr/projects/4). Phase 0 (flat-doc + voice) is shipped. Phase 0.5 is next.

## Contributing

Open an issue. PRs welcome. The project is opinionated — changes that add counts, scores, or gamification will be declined on principle.

## License

MIT
