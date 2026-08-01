# Phase 1 — The screen, free parts

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl

## Built (2026-07-31)
Backend: `backend/api/services/regression-runs/` (repo reads `evals/golden/_index.json` + each case's `content/scenarios/**`; service merges suite with reruns; controller resolves `canRerun` per request via `resolveAppEnv`). Route `GET /api/v1/regression-runs` → `internalV1` in `backend/api/server.ts`.
Admin: `admin/src/stages/regression.js` (screen + free safety strip), `admin/src/stages/regression-rows.ts` (pure cell projection). Registered in `state.ts`, `stage-loaders.js`, `router.js` (`/regression`, INTERNAL_ONLY, deliberately NOT LIVE_HIDDEN), `ui/app-nav.js` (Build group). `shared/api.js`: `getRegressionSuite()`.

Offline proof: `npm test` 223/223 (baseline was 221/221 before the 2 new test files), `npm run typecheck` clean, `npm run lint:copy` clean.
Live proof on the running app (localhost:3000 as admin): `GET /api/v1/regression-runs` returned all 8 cases with real names, roles and meeting types; the table rendered 8 rows, 2 adversarial chips, every row "Never rerun"; the free safety check ran and reported "7 still good"; nav shows Regression under Build; table text measures 14px; no console errors.
Not verified: no screenshot image. The Browser pane is not displayed in this session so it cannot composite frames. Everything above was read from the live DOM and the real API instead.

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
