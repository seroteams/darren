# Phase 1 — Per-call latency capture

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-10 — Carl walked the QA scenarios ("a") · 112/112, typecheck clean, $0

## Built (2026-07-10)
Landed:
- `backend/shared/cost.types.ts` — `CostCall.ms`, `CostSummary.total_ms`, `record(…, ms?)`.
- `backend/engine/cost.ts` — tracker stores `ms` (default 0), summary sums `total_ms`.
- `backend/engine/ai-client.ts` — times each live OpenAI/Gemini fetch, passes `ms`; cassette-replay stays `ms: 0` (no network).
- `backend/engine/cost.test.ts` — new unit test (2 cases).

Offline proof: `npm test` **112/112** (was 111 baseline + new file), `npm run typecheck` **clean**. No paid runs.

## Goal
Every recorded AI call carries how long it took (`ms`), so "which stage is slow / getting slower" is answerable from the run's cost log.

## Changes
- [cost.types.ts](../../../../backend/shared/cost.types.ts): add `ms: number` to `CostCall`; add `ms?` to `CostTracker.record`; add `total_ms: number` to `CostSummary`.
- [cost.ts](../../../../backend/engine/cost.ts): `record(stage, model, usage, ms = 0)` stores `ms`; `summary()` sums `total_ms`.
- [ai-client.ts](../../../../backend/engine/ai-client.ts): measure elapsed with `Date.now()` around each live provider fetch in `_callOpenAI` / `_callGemini`, pass to `cost.record`. Cassette-replay path records `ms: 0` (honest — no network happened).

## Not in this phase
- Surfacing `ms` in any UI (admin runs view, cost card) — capture only, no display.
- Concurrency cap / breaker (Phase 2), positive checks (Phase 3).

## Done when
- [ ] `CostCall.ms` is populated on real calls; `CostSummary.total_ms` sums them (verified by unit test on `createTracker()`).
- [ ] A run's `cost.json` shows a non-zero `ms` per live call, `0` on replayed (cassette) calls.
- [ ] `npm test` green, `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Unit test passes** — I run `npm test`; the new latency test is green. You should see the cost tracker summing `total_ms` from two recorded calls. ❌ Not OK if the test is skipped or red.
2. **Nothing else breaks** — `npm test` full suite stays green vs the baseline in plan.md. ❌ Not OK if any previously-passing test now fails.
3. **Types clean** — `npm run typecheck` reports no errors. ❌ Not OK if the new `ms` field breaks a type.
