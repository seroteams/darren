# Phase 1 — Pin the follow-up so it can't be dropped

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-09 — Carl accepted the deterministic test as proof ("A")
Carl green-lit on the red→green unit lock (no run-level change expected this phase — the honest sequencing note below was surfaced before sign-off and accepted). Committed path-scoped; no push.

## Built (2026-07-09)
- `backend/engine/queue-manager.ts` — `enforceDrillCap` now pins a runtime thread-follow at slot 0: it slices same-stage drills and advances the queue *around* the follow, never over it (mirror of the coverage gate's `insertAt` guard). ~10 lines, no new imports (`isRuntimeThreadFollow` already imported).
- `backend/engine/queue-manager.test.ts` — 2 new locks: (1) a slot-0 thread-follow survives drill-cap while the real same-stage drill behind it is still capped; (2) without a thread-follow, a same-stage drill at the front is still capped (proves the cap wasn't disabled).
- Proof: the pin lock is **red on main, green after** the fix; full suite **105/105**; my files typecheck clean (the only `tsc` errors are the parallel session's untracked `scripts/backfill-runs.ts`, not mine).

## ⚠️ Honest sequencing note (found during build)
Today thread-follow **bails** (never mints) when `consecutiveDrillCount >= 2` (`thread-follow.ts:102`), and drill-cap **only acts** when `consecutiveDrillCount >= 2` (`queue-manager.ts:206`). So on current runs the two never collide — drill-cap never has a thread-follow in front of it to eat. **Phase 1 is load-bearing groundwork that must land before Phase 2**, which relaxes the mint-bail; only *then* does a thread-follow appear under drill pressure and this pin start protecting it. Phase 1's honest proof is therefore the deterministic unit test, not a run-level metric move (that lands with Phase 2). This is why the fix is correct even though it changes no existing run's output.

## Goal
When the engine mints a thread-follow (a question that picks up what the person just said), the drill cap and the queue-shape gates must **not** be able to drop it or shove another question ahead of it. Coverage already protects it; make the rest of the pipeline do the same.

## Changes
- `backend/engine/queue-manager.ts` — `enforceDrillCap` (187-226): when `queue[0]` is a runtime thread-follow (`isRuntimeThreadFollow`, the same check coverage uses), skip it in the same-stage slice loop (210-214) and insert any stage-advance candidate at index **1**, not 0 (221-222). Mirror of coverage's `insertAt` guard (`axis-coverage.ts:93`).
- Sanity-check the closer + budget gates (233-263, `enforceBudgetLength`) don't displace a pinned front follow either; leave them if they already truncate the tail only.
- Tests: add locks in `backend/engine/queue-manager.test.ts` (and `reconcile-queue.test.ts` if the fixture lives there) — a minted thread-follow at slot 0 survives drill-cap + coverage + budget as the first served question.

## Not in this phase
- Changing *when* thread-follow mints (the early-bail under drill pressure) — that's Phase 2.
- Any prompt change. This is pure gate-ordering / pinning in code.
- The metric definition.

## Done when
- [ ] New unit test: given a queue whose slot 0 is a runtime thread-follow and `consecutiveDrillCount >= 2`, after the full gate pipeline the thread-follow is still the first question. Fails on `main` today, passes after.
- [ ] `npm test` green (offline, free); `npm run typecheck` clean.
- [ ] Free deterministic replay: `node scripts/replay-pipeline.js <a saved run where the person volunteered a thread>` shows the follow-up served where today it's dropped — I'll capture the before/after queue for the walk.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself. Next phase waits for your green light. All free — no paid run in this phase. (See the honest note above: Phase 1 is groundwork — its proof is the deterministic test, not a changed run. A changed run is Phase 2's job.)
1. **The lock fails on the old code, passes on the new** — I show the exact test that reproduces the trap: a thread-follow sitting first, the engine under drill pressure. On the code as it was, the follow gets eaten; with the fix, it survives at the front. ❌ Not OK if the test passes even with the fix reverted (then it's not really locking anything).
2. **Nothing else moved** — the drill cap still caps a real same-stage drill (second lock proves it), full suite is **105/105**, and no existing run's output changes. ❌ Not OK if any other test went red or the drill cap stopped firing.
3. **You understand the trade** — you're OK that Phase 1 lands as safety groundwork with no visible run change yet, because the run-level payoff (and the paid metric proof) comes in Phase 2. ❌ Not OK if you wanted a visible change now — then we'd fold Phase 1+2 into one paid phase instead.
