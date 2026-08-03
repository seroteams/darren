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

- On a second (or fifth) 1:1 with a person, the panel carries Overview, Discussion and Agreed from the previous finished run, and Live scores shows that run's four reads.
- A first 1:1 with someone shows exactly today's panel. No empty tab.
- On "Start the meeting" the review is gone and the panel is Support plus live scores.

## Carl's calls (2026-08-03)

- **Discussion = the questions asked and the note typed against each**, not a summary of them.
- **The review disappears on "Start the meeting".** No third tab mid-meeting.
- **Test screen first.** Nothing touches the real runner until he has walked it.

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

**Phase 1 🔨 built 2026-08-03, £0, awaiting your walk.** `/admin/test` → "The last 1:1, on
the walk-in screen". One new file plus one gallery entry; nothing outside
`admin/src/stages/tests/` and `test.js` was touched.

Deliberately real rather than rebuilt, so it walks like the live screen: the split and the
panel wear the shipped `coach-panel.css`, the left card is the real `readyCardHtml()`, and
Agreed is the real `renderPromiseList()` with its own chips. Only colour and spacing are new,
so no size, weight or leading was added outside `design/type.css`.

The mock is sized off a real saved run (5 turns, roughly 150-character notes), because the
question this phase exists to answer is whether Discussion reads or is a wall.

232/232, typecheck, copy lint and token lint all clean. Screenshots at desktop and 390px in
[proof/](proof/): both arrangements, last meeting's scores, the first-1:1 state and the
hand-over on start.

## To decide at the walk

- **A or B.** Stacked in one scroll, or the three behind sub-tabs.
- The left card already offers last time's open actions as a button while Agreed shows the same items read-only. Same content twice on one screen, or read-then-tap.

## Parked

- Any change to the meeting itself, the engine, or a prompt.
- A third segment. The 72px header already wraps below 900px with two.
