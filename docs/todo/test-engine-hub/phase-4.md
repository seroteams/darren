# Phase 4 — Consolidation: three pages become one (free)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The nav slims down: "Test engine" is the one entry; the free safety check lives on that page; Compare opens pre-loaded from a persona's history.

## Changes
- Hub gets a compact **"Free safety check (no AI)"** strip at the top: summary line + Re-check button + only the failing rows (the same offline check the Regression page runs today). The nav alert dot keeps working.
- [regression.js](../../../admin/src/stages/regression.js) deleted; its nav row + route removed (old bookmarks fall back to home — already the router's behavior).
- "Compare runs" leaves the nav; [compare.js](../../../admin/src/stages/compare.js) stays as a page and learns to open with two runs pre-selected — reached from "Compare with previous run" on a persona's history.
- Personas nav row relabeled **"Test engine"** in [router.js](../../../admin/src/router.js) / [main.js](../../../admin/src/main.js).

## Not in this phase
- Touching the review screen or the engine — nothing paid here.

## Done when
- [ ] `npm test` green, typecheck clean, admin build ✓
- [ ] Product owner has tested the scenarios below and said go
- [ ] Folder moves to `docs/todo/done/` after the green light (plan complete)

## Test scenarios — for the product owner
Walk through these yourself.
1. **One nav entry** — the left rail shows "Test engine" and no more "Regression" or "Compare runs" rows. ❌ Not OK if any old row remains or the nav order looks broken.
2. **Safety check on the hub** — on Test engine, the safety strip shows the summary ("N still good…"), Re-check works instantly (it's free), and only problem cases are listed. ❌ Not OK if the full case list floods the page when everything's fine.
3. **Compare from history** — on a persona with 2+ runs, click "Compare with previous run". The compare page opens with both runs already loaded side by side. ❌ Not OK if you land on empty dropdowns.
4. **Old links don't crash** — type the old `/regression` address. You land on home, no error screen.
