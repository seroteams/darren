# Phase 5 — Live enablement + bless baseline

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The live admin gets the screen honestly (free check + history + a polite "reruns are switched off here"); locally, Carl can bless a rerun as the new baseline.

## Changes
- List response gains `canRerun` (false on live via `resolveAppEnv()`); UI shows "Paid reruns are switched off on the live site" instead of a dead button. Enabling later = delete the `blockOnLive` wrapper + flip this flag (the one-line switch).
- NEW route `POST /api/v1/regression-runs/:caseId/bless` → `internalV1(blockOnLive(...))` — writes `expect` from the latest rerun's trust-checks into `evals/golden/<file>.json`; refuses adversarial cases with live hard-fails (mirrors `gate.js::updateBaseline`).
- Admin: "Bless as baseline" per case (local only) with plain-language confirm: "This makes today's result the new normal."
- Live empty-history copy: reruns happen locally; history appears here only if reruns are ever switched on.
- Free tests: env guards (start + bless refuse on live), bless refusal rules.

## Not in this phase
- Actually enabling paid reruns on live (parked — one-line switch when Carl says so).

## Done when
- [ ] Guard + bless tests green; `npm test` + typecheck clean.
- [ ] Bless verified by the golden file's git diff (the destination, not the routing).
- [ ] Live verified after deploy: screen loads for superadmin, free check works, rerun politely off.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Bless** — `local > localhost:3000/admin > Build > Regression` — on a green case, press "Bless as baseline" and confirm. You should see the confirm explain itself in plain words, then the case show today as its baseline. ❌ Not OK if an adversarial case with a safety failure lets you bless it.
2. **Live, honestly off** — after the next go-live: `live > incognito window > sero.team/admin (superadmin) > Regression`. You should see the 8 cases, the free check working, history explaining it fills only if reruns are switched on here, and Rerun saying it's switched off on the live site. ❌ Not OK if a Rerun press spends money on live.
3. **Reviews still work on live** — open any finished run from the screen on live and confirm the usual review tool loads.
