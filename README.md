# Foot*note*

Built for thinking on foot. Open source, offline-first PWA.

---

Walking creates a specific kind of thinking. Not desk thinking. The kind where a question that's been sitting for days starts to move. Where the phrase you've been reaching for arrives in the third block, uninvited.

Most tools aren't built for this. They were designed for someone sitting still, with time to organize and curate. When you're walking, that friction breaks the thread.

Foot*note* has one job. You open it, you walk, you speak or type. Everything goes into one continuous document, saving as you go. When you stop, your walk is there. Timestamped, location-tagged, synced to iCloud. Nothing to retrieve. It's just there.

## Free

- One continuous document: everything you've ever thought on a walk, with each walk marked in context. No navigation, no folders, no organization required.
- Auto-saves everything: every keystroke, every Siri commit, before you put the phone in your pocket.
- Stays on your device: no account, nothing leaves your phone. Provably private.
- iCloud sync: your document lives in a folder you control, updating after every walk. No export step.
- GPS and timestamp on each walk, so the thought comes back whole.
- Screen stays on during dictation.
- Works without signal.

## Pro ($4.99, one time, coming soon)

- Markdown export: clean, portable output of your full document or individual walks
- Full walk history: jump to any walk directly
- Walk stats: word count, duration, distance
- Export any walk as a standalone file

## AI (coming soon, optional subscription)

- Transcript cleanup: fixes what dictation got wrong, on-device, private
- Walk digest: a brief summary of each walk's key ideas
- Pattern finder: surfaces the ideas you keep returning to
- Seed questions: suggests a thread for the next walk based on what you've been circling
- Cross-walk connections: links a thought today to a related one from weeks ago

---

Walk. The app follows quietly. Your thinking is there when you stop.

Add Foot*note* to your home screen from Safari for the full experience. It runs as a web app today. A native iOS app is in the works.

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

[footnote-tan.vercel.app/roadmap](https://footnote-tan.vercel.app/roadmap)

## Contributing

Open an issue. PRs welcome. The project is opinionated. Changes that add counts, scores, or gamification will be declined on principle.

## License

MIT
