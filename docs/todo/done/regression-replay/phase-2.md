# Phase 2 — Full set + automatic

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
All 8 saved runs are covered, and the check runs automatically every time the normal test command runs — so it can't be forgotten.

## Changes
- Capture the remaining 5 saved runs → 8 total in `evals/replay/` (the healthy bi-weekly / performance / feels-off cases alongside the safety tests).
- New `scripts/test-replay-regression.js` — a thin wrapper that fails if any saved run drifted.
- Register it in `scripts/run-tests.js` so `npm test` includes it.

## Not in this phase
- The in-app screen (Phase 3).

## Done when
- [ ] `npm run replay` shows all 8 saved runs, green.
- [ ] `npm test` includes the new check and passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **All eight, green** — Run `npm run replay`. You should see 8 rows, all "still good". ❌ Not OK if any are missing or error.
2. **It's part of the normal tests now** — Run `npm test`. You should see a line for the new regression check among the others, and the whole run should pass. ❌ Not OK if the new check is absent.
3. **Still free** — No step calls the AI or mentions cost.
