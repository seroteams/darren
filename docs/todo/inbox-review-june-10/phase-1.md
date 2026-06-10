# Phase 1 — Progress header

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
At the top of the Library, show how far through the pile you are — "X of N reviewed" with a progress bar, plus how many runs are still marked Fix or Block.

## Changes
- `frontend/client/src/stages/library.js` — after the runs load, render a progress block inside the existing page header. All numbers come from data each row already carries (`reviewStatus`, `overall`) — no new server call.
  - Reviewed = runs whose review is complete (all 8 checks decided).
  - Show "Fix N · Block M" so the open work is visible at a glance.
  - Progress bar fill = reviewed ÷ total.
- Small CSS for the bar in the existing styles file, matching the look of the standalone tool's bar.

## Not in this phase
- Moving between runs (Phase 2).
- Sending runs to Claude (Phase 3).

## Done when
- [ ] Library header shows "X of N reviewed", a bar, and the Fix/Block counts.
- [ ] Numbers match what the filters show.
- [ ] `npm run gate` passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **First look** — open the Library. You should see a line like "7 of 12 reviewed" with a filled bar and "Fix 2 · Block 1". ❌ Not OK if the bar is empty when you've clearly reviewed runs.
2. **Counts agree** — click the **Fix** filter and count the rows. It should match the "Fix N" in the header. Same for **Block**.
3. **It moves** — fully judge one unreviewed run (all 8 checks), come back to the Library. The "X of N reviewed" should have gone up by one and the bar should be a little fuller.
4. **Empty case** — if there's a brand-new run nobody's touched, "reviewed" should not count it.
