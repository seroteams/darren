# Phase 3 — Cost per run

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Click a run, see what it cost in real dollars; click a person, see their total — the cache-regression worry made visible where the activity is.

## Changes
- **Backend:** new pure `costFromState(state)` in `backend/engine/run-history.ts` → `{ usd, calls } | null` (reads `state.briefing.cost.usd_total` / `call_count`; null when absent or malformed — old runs never lie "$0.00"). Added to `listFinishedRuns` there and `toFinishedRow` in `backend/db/runs-store.ts` (both backends, same commit; parity seed must include a `briefing.cost`).
- **Frontend model:** run nodes gain `costUsd` + `costCalls`; person nodes gain `totalCostUsd` (sum of non-null run costs, null when none); pure `fmtUsd()` ("$0.04"; sub-cent shows three decimals so tiny dev runs don't all read "$0.00"); panel rows — run: "Cost to run · $0.04 (23 model calls)", person: "Total cost · $0.XX".
- **Renderer:** untouched — the rows come free via `describeNode`.

## Not in this phase
- Any visual cost treatment (hotter/bigger) — parked in plan.md.
- Cost anywhere outside the admin Universe.

## Done when
- [ ] Backend + admin `npm test` and `npm run typecheck` green.
- [ ] A run's panel cost matches that run's Review-page cost block, seen side by side.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner
1. **The number is real** — click a recently finished run moon. "Cost to run · $0.0X (N model calls)" matches the cost shown on that run's Review page. ❌ Not OK if they disagree.
2. **Person total adds up** — click that run's person: "Total cost · $0.XX" equals the sum of their runs' visible costs.
3. **Old runs stay honest** — a run finished before cost tracking shows no cost row at all. ❌ Not OK if it claims "$0.00".
4. **Both storage modes agree** — dev file mode and Postgres mode show the same figures for the same run.
