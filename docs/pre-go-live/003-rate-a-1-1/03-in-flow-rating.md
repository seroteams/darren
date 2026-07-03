# Phase 003 · Step 03 — Ask right after the 1:1 (in-flow)

## Goal
Catch the rating when the memory is fresh: a gentle one-tap star row at the **end of a 1:1** (the briefing
screen), with **Skip** always available — so ratings actually get given.

## Technical detail
- On the member's end-of-run briefing view, add the same star control (reuse Step 02's widget) with a
  clear **Skip**. Rating there calls `rateMyRun` for the just-finished run's id.
- **No nag:** never show an "X unrated" count anywhere; the unrated state stays neutral and inviting.

## Check
- `npm run typecheck` clean; `npm test` green. Finish a 1:1 → a gentle rate prompt appears; Skip dismisses
  it; rating persists and shows on the run's detail + list badge.

## Note
This touches the member briefing/debrief surface — confirm where a member lands at the end of a run and
add the prompt there (don't disturb the admin briefing view).
