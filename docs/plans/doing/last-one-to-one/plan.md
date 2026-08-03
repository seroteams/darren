# Last 1:1 on the walk-in screen

**Goal:** Starting a repeat 1:1 with someone, the right-hand panel of "Before you walk in" is a review of last time (what happened, what was said, what was agreed) plus last meeting's scores. It goes away the moment the meeting starts.
**Driver:** Carl
**Created:** 2026-08-03

## Why

The walk-in screen's right half is nearly dead weight today: Support shows the prep brief's
three generic listen-for cues, and Live scores shows four rows that all say "Not rated".
On a repeat 1:1 Sero already holds the whole of last time and shows none of it here, so the
manager has to leave the runner and open the person page to see any of it.

## Done means

- On a second (or fifth) 1:1 with a person, the panel is a **20-second glance** at last time: one sentence on what it was, what was agreed with how it landed, and the four reads. One card, no tabs, no scroll.
- A first 1:1 with someone shows exactly today's panel. No empty tab.
- On "Start the meeting" the glance is gone and the panel is Support plus live scores.

## Carl's calls (2026-08-03)

- **Test screen first.** Nothing touches the real runner until he has walked it.
- **The review disappears on "Start the meeting".** No third tab mid-meeting.
- ~~Discussion = the questions asked and the note typed against each~~ **overturned by the
  prototype.** Seeing it built: *"wrong direction completely, it should be 20s to read all
  left and right, quick, view."* The full record is a reading task. The panel is a glance.

## Phases

| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Test screen | Walkable prototype in the Tests gallery, two arrangements to choose between, plus the first-1:1 and meeting-started states | 🔨 built, awaiting Carl's walk |
| 2 | The read | `GET /api/v1/sessions/:id/prior-recap`, cloned from the proven `prior-promises` pair | ⬜ |
| 3 | The real screen | The panel gains a "last" mode; segment label and hand-over in questioning.js AND bank.js | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Cost

**£0, all three phases.** No new AI call anywhere: every field already exists on the
previous run. No paid run is needed to prove any of this.

## Current state

**Phase 1 🔨 round 2 built 2026-08-03, £0, awaiting your walk.** `/admin/test` → "The last
1:1, on the walk-in screen". One new file plus one gallery entry; nothing outside
`admin/src/stages/tests/` and `test.js` was touched.

Round 1 put the whole of last time on the right, including every question and the note
typed against it. It ran past 2,200px of scroll and Carl called it wrong on sight, which
is what the prototype was for. Round 2 is one card: a sentence, the agreed rows with
their chips, and the four reads as a single chip line.

**The 20 seconds is measured on screen**, both columns, live as you flick the switches.
The finding worth keeping: the right panel is not the problem. At its tightest it is 48
words, about 15 seconds. The screen only reaches 20 seconds if the **left card** gives
something up, and that card is engine-written, so this is a prompt decision as much as a
layout one. Full numbers in [phase-1.md](phase-1.md).

232/232, typecheck, copy lint and token lint all clean. Screenshots at 1440px and 390px in
[proof/](proof/).

## To decide at the walk

- **Everything agreed, or only what's still open.**
- **How short the left card writes.** As written is ~35s; the aim alone is ~24s.
- **Scores in or out.** They cost about 2 seconds.
- The left card already offers last time's open actions as a button while the glance lists the same items read-only. Same content twice on one screen, or read-then-tap.

## Parked

- Any change to the meeting itself, the engine, or a prompt.
- A third segment. The 72px header already wraps below 900px with two.
