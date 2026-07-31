# Phase 2 — Paid rerun of one case

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Press Rerun on one case → the real engine runs the frozen inputs end to end, the safety checks grade it against the baseline, and the run opens in the existing review tool.

## Changes
- NEW `backend/api/services/engine-job-slot.ts` + `.test.ts` — ONE shared single-job slot; `persona-runs.service.ts` switched onto it (its tests keep passing). Conflict message names the other tool.
- NEW `backend/api/services/regression-runs/regression-runs.runner.ts` + `.test.ts` — in-process dynamic lane mirroring `session-streams.ts` (manual bank branch ~141–183; planStream queue policy ~437–512: adopt newQueue, pin prep opener, agenda budget growth, closer insert). Positional answer cursor: `answers[cursor++] ?? ""` = skip padding (smoke-test idiom) — this is the "adapts to engine changes" property. Sessions: `mode:"manual"`, `runLabel:"regression:<batchId>:<caseId>"`, `userId:null`. After evaluate: `runTrustChecks` + `logRunRoot("trust-checks.json", {caseId, batchId, expected, actual, newHardFails, regressed})` with `gate.js:162-166` semantics.
- `regression-runs.service.ts` — `start(caseIds)`, `current()` (per-case progress), cumulative batch cost ceiling $6. Controller wires real engine boundaries like `persona-runs.controller.ts`.
- Repo: real `listReruns()` — pg `LIKE 'regression:%'` on `run_label` (`backend/db/runs-store.ts`); file impl over the run-history walk.
- `backend/api/server.ts`: `POST /api/v1/regression-runs` → `internalV1(blockOnLive(...))`; `GET /api/v1/regression-runs/current` → `internalV1`. `shared/api.js` wrappers.
- Admin: per-case Rerun button ("about $0.35 in AI, 1–2 minutes"), run-bar + 2s polling from `personas.js`, trust badge (OK / REGRESSED + hard-fail names), Open run → `/run/:id`. Warning row when a scenario has fewer answers than the arc budget (degrade politely, never refuse).

## Not in this phase
- AI reviewer, rerun-all, history, live behaviour, bless.

## Done when
- [ ] Free proof first: runner unit tests (cursor, pad-to-skip, budget growth, queue adoption), slot contention both ways, grading semantics; `npm test` + typecheck clean.
- [ ] One real rerun's verdict row verified in the DATABASE (run_label + trust-checks artifact), not just on screen.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > localhost:3000/admin (dev login) > Build > Regression`
Pressing Rerun spends about $0.35 — your click is the approval.
1. **One rerun** — press Rerun on the first case. You should see a progress bar walk Setup → Focus → Prep → Interview (question N of M) → Recap in 1–2 minutes, then the row fill with today's date and a trust verdict. ❌ Not OK if it errors or the row stays "Never rerun".
2. **Read it** — press Open run. You should see the full conversation (every question and answer) and the recap, and be able to mark your 8 pass/fails and Keep/Fix/Block exactly as usual.
3. **One at a time** — while a rerun is going, open Test engine and try to run a persona. You should get a polite "wait — the other tool is mid-run" message, not two spends at once.
