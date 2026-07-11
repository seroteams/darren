# Phase 3 — Cost per run

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-11 — Carl's "a" (walk WAIVED, his call: his dev API — PID check — still predates the build, so cost rows weren't on his screen yet). Agent verification stands: 116/116 incl. pg-parity, and the feed proven live on a FRESH API against real data (19/25 runs priced, 4 rated). Residual until his next API restart: cost + rating rows on his own screen. (commit f5c3e341)

## Built (2026-07-11)
- `backend/engine/run-history.ts` — new pure `costFromState(state)` → `{ usd, calls } | null` (null when the run predates cost tracking — never a fake "$0.00"); added to `listFinishedRuns` and exported for the pg store.
- `backend/db/runs-store.ts` — `toFinishedRow` gains `cost: costFromState(r.state)` (same shared helper, both stores in one commit; pg-parity proof passed — its seed already carries a `briefing.cost`).
- Tests: `run-history.test.ts` (costFromState shapes incl. zero-vs-missing and string-is-not-money) + `runs-store.test.ts` (row carries cost / null for old runs).
- `admin/src/stages/universe.model.ts` — run nodes carry `costUsd`/`costCalls`, person nodes `totalCostUsd` (sums only priced runs, null when none); `fmtUsd()` ("$0.38", sub-cent "$0.004"); panel rows "Cost to run · $0.38 (9 model calls)" and "Total cost · $0.53". Renderer untouched — rows come free via `describeNode`.
- Tests: 3 new model tests (red→green; one real bug caught red: the model's `asRecord` returns null, unlike the backend's).
- Offline proof: `npm test` 116/116 (incl. pg-parity), typecheck clean.
- Live proof against a FRESH API (port 3091, new code, real data): the finished feed carries cost on **19 of 25 runs** (sample: "Carl → $0.0428, 5 calls"); the 6 pre-tracking runs show null. Bonus finding: **4 runs already carry star ratings** — the P2 residual clears when Carl's dev API restarts.
- ⚠️ Note: Carl's long-running dev API (3001) predates all of this — cost/rating rows appear there after its next restart. The preview tab froze mid-check (hidden-pane quirk), so the panel-row DOM was verified via the tested pure model + the P1b/P2-verified panel path, not clicked live this time.

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
