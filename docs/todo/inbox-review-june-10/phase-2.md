# Phase 2 — Inbox navigation

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Move through runs like email: judge one, go straight to the next without returning to the list, step back if you want, and get a clear "nothing left" screen at the end.

## Changes
- `frontend/client/src/state.js` — remember the working list when you open a run: the ordered run ids you're walking and where you are in them.
- `frontend/client/src/stages/library.js` — when you open a run, capture the **currently filtered/searched** list as the queue (so "next" follows whatever you're looking at, e.g. only Unreviewed).
- `frontend/client/src/stages/review-run.js` —
  - Add **Save & next** and **Prev** buttons next to "Back".
  - Next/prev saves the current run first, then loads the neighbour in the queue. (Re-mount works by bumping the existing `stageTick` — same trick the live flow already uses, so the URL updates and Back still works.)
  - Keyboard: `]` = next, `[` = prev. `Esc` still goes back to the list.
  - At the end of the queue, show an "inbox empty — nothing left" panel with a "Back to Library" button instead of loading a run.

## Not in this phase
- "Next *unreviewed*" smart-skip — for now next just means the next one in the list. (Can revisit if you want it.)
- Sending to Claude (Phase 3).

## Done when
- [ ] From the Library you can open a run, judge it, and go to the next without returning to the list.
- [ ] Prev works; Back (Esc) still returns to the list; the URL still points at the run you're on.
- [ ] Reaching the end shows the "nothing left" screen.
- [ ] `npm run gate` passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Walk the pile** — filter to **Unreviewed**, open the first run. Judge it, click **Save & next** (or press `]`). The next Unreviewed run should load, scrolled to the top, showing its own (blank) verdict. ❌ Not OK if it reloads the same run or jumps to an unrelated one.
2. **Go back a step** — press `[` (or **Prev**). You should land on the run you just did, with your marks still there.
3. **Follows the filter** — switch to the **Fix** filter, open a run, hit next. It should move to the next **Fix** run, not some random one.
4. **End of inbox** — keep pressing next to the last run, then once more. You should see "nothing left to review" and a button back to the Library. ❌ Not OK if it errors or loops.
5. **Escape still works** — mid-pile, press `Esc`. You should be back on the Library list, and your last run's verdict should be saved.
