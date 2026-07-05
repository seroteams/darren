# Phase 5 — QA tools + Universe

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

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
