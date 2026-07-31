# Phase 1 — The screen, free parts

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A "Regression" screen in the admin that lists the 8 frozen test cases and runs the existing free safety check — no paid anything yet.

## Changes
- NEW `backend/api/services/regression-runs/regression-runs.repo.ts` — reads `evals/golden/_index.json` + case files + their `content/scenarios/**`; `listReruns()` stubbed to `[]` this phase.
- NEW `backend/api/services/regression-runs/regression-runs.service.ts` + `.test.ts` — suite list merged with latest-rerun rows (empty for now).
- NEW `backend/api/services/regression-runs/regression-runs.controller.ts` — `list`.
- `backend/api/server.ts` — `GET /api/v1/regression-runs` → `internalV1`.
- NEW `admin/src/stages/regression.js` — scaffold + free safety strip (lift `mountSafetyStrip` from `personas.js`, same `GET /api/v1/regression/run`) + um-table: Case / Meeting / Last rerun / Trust / Committee / Your review.
- NEW `admin/src/stages/regression-rows.ts` + `.test.ts` — pure row projection (badges, "Never rerun").
- Register: `admin/src/state.ts` (STAGES.REGRESSION), `admin/src/stage-loaders.js`, `admin/src/router.js` (`/regression`, INTERNAL_ONLY, NOT LIVE_HIDDEN), `admin/src/ui/app-nav.js` (Build group, label "Regression"). `shared/api.js`: `getRegressionSuite()`.

## Not in this phase
- Any paid run, the Rerun button doing anything, the AI reviewer, history, live behaviour.

## Done when
- [ ] `GET /api/v1/regression-runs` returns the 8 cases (verified with a real request, not from code).
- [ ] `npm test` + `npm run typecheck` + `npm run lint:copy` clean; screenshot of the real screen taken.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
`local > localhost:3000/admin (dev login) > Build > Regression`
1. **The list** — open the Regression screen. You should see 8 test cases with their meeting type, and every row saying "Never rerun". ❌ Not OK if the list is empty or errors.
2. **Free safety check** — press Re-check in the strip at the top. You should see "N still good · N need a look" update within a few seconds, at no cost. ❌ Not OK if it spins forever.
3. **It's in the rail** — "Regression" appears under Build in the left rail, and reloading the page keeps you on it.
