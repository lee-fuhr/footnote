# Philosophy

*Source-of-truth doc for Footnote's voice, principles, and product decisions. Lives in the repo. Every Footnote contributor reads it before writing copy. Every new feature gets checked against it before merge. Updated when the project learns better.*

---

## A sidewalk thought

I was crossing 23rd Street at the light. It was late October, the kind of afternoon where the sun sits low and golden and you can feel the season turning. Halfway across the crosswalk, something landed in my head. Not a full idea. More like a shape. A way of saying something I had been circling for weeks. I reached for my phone. The light changed. I made it to the curb, and it was gone.

Three blocks later, I was still trying to reconstruct it. The shape. The angle. The specific texture of that thought. I never got it back. But I started noticing how many thoughts arrive exactly that way: at a particular curb, on a particular day, with no invitation and no warning.

I spent a year building tools to capture those. The best ones never came when I sat down to review data. They came when I was moving. When my hands were in my pockets and my eyes were on the sidewalk.

## What I noticed

I noticed that the moment I opened a note-taking app to capture a walk-thought, the thought vanished. The act of naming it, categorizing it, gave it a gravity it didn't need. As soon as I started tracking how many ideas I had, I stopped having them. The meter becomes the point.

I spent a rainy Tuesday looping around the reservoir with a counter on the screen. I thought seeing the volume would motivate me to say more. Instead, I found myself watching the digits climb like a score in a game. I wasn't noticing the trees or the way my thoughts were shifting. I was just trying to beat yesterday. I came home and stripped every stat from the interface. Now there are no numbers to chase.

I noticed that the thought belongs to the place, not the day. A Tuesday thought about a blue door stays with that blue door. A thought about forgiveness stays with the hill where the sun broke through the trees. The place is the container, not the date.

I noticed that the best one is usually the one I almost forgot. The one that slips through the net. The one that arrives when I'm thinking about dinner or the way the shadows fall.

I noticed that walk-thoughts don't need to mean anything. They don't need to be important. They don't need to be developed. They just need to land somewhere.

You're crossing a street and there it is, an idea that belongs only to that curb, that particular piece of pavement. A sidewalk thought. It's gone by the next block. Footnote grabs it without stopping you. You keep walking; it keeps the thought.

## What this isn't for

If a thought matters and you know why, write it down properly. Notes, Drafts, sit and think.

If you're processing something emotional, that wants a journal at your desk.

If you're tracking miles or pace, find an app that does that well; this one doesn't.

Footnote is for the thoughts in between. The ones that don't deserve a home anywhere else.

## How it works

I walk the same path you do. Built by one person for himself, then shared. Your words, your route. By default, no algorithm touches either. If you choose to unlock AI Insights, your walks are sent to Anthropic's Claude with your explicit consent, analyzed, then discarded. Not stored, not used for training, off by default. If the app ever makes you stop walking to use it, I messed up. It should feel like a pocket, not a tool.

Footnote is one flat notepad. Everything you catch lives in a single continuous document, your whole walking history in one place. Features don't open new screens or carry you somewhere; they get layered onto that document as quiet inline marks. When a walk ends, you stay right where you are, in the notepad, looking at the lines you just caught. A small inline row offers to keep that walk or let it go. Do nothing and it stays. There's no separate review screen, no file to deal with, no place you get sent. Nothing about a walk ever interrupts you. The only screens that are not the notepad are the ones you choose to step into for a moment, like insights or settings, and they hand you straight back to where you were.

## What I'll get wrong

This is a first attempt. Some decisions will prove wrong. I'll change them when I learn better. The goal isn't to defend the philosophy. It's to keep the product honest.

Voting used to ask for your phone number, and that always sat wrong with me. I took it out. Voting is now bound to your device, one vote per device, no account and no login. Your choice leaves; nothing else does. It is the better way I said I would find.

If you walk and the app gets in your way, tell me. That's how the principles earn their keep.

---

Footnote is a place for the thoughts that only show up when your feet are moving. Not the important ones. Not the ones you'd write down anywhere. The ones that arrive at a specific corner, on a specific Tuesday, and leave by the next block. They don't need to mean anything. They just need to land somewhere.

---

## Operating rules (for future contributors and future-Lee)

- **No counts in user-facing UI.** Numbers turn a quiet tool into a dashboard. The only exceptions are time displays (e.g., session start time) and the founder pricing slot indicator.
- **Sidewalk thought is named in three places only.** Onboarding empty state, this philosophy doc, the public `/philosophy` page. Not in microcopy. Not in error states. Not repeated mechanically.
- **No exclamation points. No em dashes. Curly quotes always.** This isn't optional. Run `scripts/voice-lint.sh` before merge.
- **Every new copy surface gets a philosophy-product check.** If a claim contradicts a behavior, fix the behavior or rewrite the claim. Don't ship aspirational lying.
- **One flat notepad. Everything lives in one continuous document.** Features get layered onto that document as inline markup or decoration, never a separate screen the user is involuntarily brought to. A few things may live in a deliberate cul-de-sac, a momentary out-and-back the user chooses to enter (insights, settings), but those return straight to the notepad. Minimum views, minimum motion, no involuntary screens. Ending a walk is turning off editing mode on the document (capture to browse), not a destination: the user stays in the document, scrolled to what they just caught. Keep and let-go are inline affordances on that walk's section, not a takeover. This supersedes the older “Coda is the one allowed interruption” framing.
