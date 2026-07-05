# Phase 3 — Hub UI + the first real run (~$0.35, your click)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done 2026-07-05 — Carl ran a persona end-to-end, "it runs"

## Goal
The Personas page becomes the Test-engine hub: ▶ Run on each persona card, live progress, and after the run a straight path into the review screen — proven by ONE real run that you click yourself.

## Changes
- [personas.js](../../../admin/src/stages/personas.js) becomes the hub:
  - Each persona card gets **▶ Run** with the plain cost line shown *before* clicking: "Runs the full engine with this persona's scripted answers. Costs about $0.35 in AI and takes 1–2 minutes."
  - While running: progress on the card (stage name + question x of y), polled every 2 seconds; all other Run buttons disabled (one at a time).
  - When done: "Finished — review it" → opens the run in the existing review screen (`/run/:id`, the 8-dimension grid).
  - Each card shows its run history line: last run date + verdict badge (keep/fix/block) + "See result".
- [shared/api.js](../../../shared/api.js): two small helpers (start run, poll current).
- Actual cost from the run's tracker shown once finished.

## Not in this phase
- Nav changes, regression strip, compare deep-link (Phase 4).

## Done when
- [x] `npm test` green (67/67), typecheck clean, admin build ✓
- [x] Hub renders: 12 persona cards, each with ▶ Run + the cost line; 6 show a "Last run" line with a verdict badge; no console errors (browser-verified on a throwaway Vite instance 2026-07-05 — did NOT click Run, that's Carl's paid go-ahead)
- [x] One real run completed end-to-end, clicked by the product owner (~$0.35) — Carl ran it 2026-07-05
- [x] Product owner has tested the scenarios below and said go — "yeah its good it runs :)"

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light. **Scenario 2 costs ~$0.35 — one run, once.**
1. **The button is honest** — open Personas. Every card shows ▶ Run with the cost sentence *before* you click anything. ❌ Not OK if anything runs on page load, or the cost isn't stated up front.
2. **One real run** — click ▶ Run on one persona (your pick). You should see progress change on the card (stage names, then "question 2 of 7"-style counts), and in 1–2 minutes "Finished — review it". ❌ Not OK if the page has to stay untouched to work — refresh mid-run and the progress should still be there.
3. **Review it** — click through to the result. The full briefing is there, and you can mark the 8 pass/fail dimensions + overall verdict + a note, and it saves. ❌ Not OK if the result looks different from a normal run in the Library.
4. **The badge sticks** — go back to Personas. The persona you ran shows the date and your verdict as a badge. Open the run from there. ❌ Not OK if the card still looks like it was never run.
5. **No double spend** — while a run is going, every other Run button is off, and trying to start another is refused politely.
