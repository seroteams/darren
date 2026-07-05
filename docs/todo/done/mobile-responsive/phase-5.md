# Phase 5 — QA tools + Universe

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done — green-lit by Carl 2026-07-05 ("commit, its good")

> Build notes (2026-07-05): scope shrank — Regression was deleted and Personas became the
> "Test engine" page (test-engine-hub track), and Guide's overflow was already fixed in
> Phase 4. Landed: Compare below 640px stacks each row (label full-width, A/B cells side
> by side under it) and restacks the axis diffs (name + values on top, full-width track
> below); the run pickers go full-width. Universe: `touch-action: none` on the canvas —
> its pointer handlers already speak touch, the browser just kept stealing the drag for
> page scroll; canvas sizing was already viewport-driven (ResizeObserver + 100dvh).
> Verified live at 375: Compare, Test engine, Coaching phrases, Role words, Meeting arcs,
> Universe — all zero page overflow; Compare row/axis stacking verified with injected
> markup (my test account has no runs to diff). Mid-verification the new manager-ready
> redirect landed and started bouncing my manager test account off internal tools — so
> the final Universe touch-drag check is yours (admin account). Pinch-zoom stays parked.

## Goal
The internal QA tools — Compare, Regression, Personas, Coaching phrases, Role words, Meeting arcs, Guide — get real phone layouts (stacked, not just scrollable), and Universe is navigable on touch.

## Changes
- `admin/src/styles/design.css`:
  - Compare: below 640px each compare row stacks — label full-width, then the A and B cells (the existing A/B tags carry which is which).
  - Regression / Personas / lexicon pages / Meeting arcs / Guide: grids collapse per the house `.l-grid` idiom; header and action rows wrap; any remaining wide block scrolls inside its own container, never the page.
- `admin/src/stages/universe.ts` — canvas sizes to the viewport + basic one-finger drag (~30–60 lines). Pinch/multi-touch is parked: if drag balloons, the fallback is "page loads, doesn't break, drawer can navigate away" — Carl's call at QA.
  ⚠️ Carl has uncommitted WIP in `universe.ts`/`universe.test.ts` — do not start this phase's universe work until that WIP is committed or cleared.

## Not in this phase
- Pinch-zoom / inertia on Universe (parked).

## Done when
- [ ] Every listed screen at 375px: no page-level sideways scroll, all controls reachable.
- [ ] Free checks green: `npm test`, `npm run typecheck:admin`, admin build.
- [ ] Product owner has tested the scenarios below and said go — then the whole folder moves to done/.

## Test scenarios — for the product owner
1. **Compare on the phone** — open Compare, pick two runs. Each comparison row stacks (label, then A, then B) and the verdicts read clearly. ❌ Not OK if you have to scroll the whole page sideways.
2. **QA tools sweep** — open Regression, Personas, Coaching phrases, Role words, Meeting arcs, Guide one after another. Each is readable and tappable; wide bits scroll inside their own box only.
3. **Universe** — open Universe. It fills the screen and you can drag it around with one finger; you can leave via the drawer.
