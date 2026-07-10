# Phase 2 — Concurrency cap + circuit breaker on AI calls

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-10 — Carl walked the QA scenarios ("a") · 6/6 my tests (5/5 loops), suite 113/113, $0

## Built (2026-07-10)
Landed:
- `backend/engine/ai-guard.ts` (new) — `createSemaphore` (FIFO slot limiter), `createBreaker` (closed→open→half-open, injectable clock), `createAiGuard` (cap outside, breaker inside), and a process-scoped `aiGuard` from `AI_MAX_CONCURRENCY` (default 4).
- `backend/engine/ai-client.ts` — live OpenAI/Gemini calls now run through `aiGuard.run(...)`. Replay path returns before the guard, so tests/evals stay unthrottled and deterministic.
- `backend/engine/ai-guard.test.ts` (new) — 4 cases: cap never exceeded, breaker opens + fast-fails, half-open→close on probe, guard leaves successes intact.

Offline proof: my 6 engine-hardening tests pass **5/5 loops** (no flakiness); full suite **113/113**.

⚠️ **Honest note — foreign red in the tree:** `npm run typecheck` currently reports 8 errors, ALL in `backend/api/services/feedback/feedback.service.test.ts` — a *different* session's unfinished validation-kit P3 (briefing feedback) work. None are mine; my files typecheck clean. I will not touch or commit that file. Phase 2 commits only my 3 files at green-light.

## Goal
Cap concurrent in-flight live model calls, and trip a circuit breaker when a provider keeps failing instead of hammering it — the two safeguards old Sero had and we don't.

## Changes
- New `backend/engine/ai-guard.ts`: a semaphore (`AI_MAX_CONCURRENCY`, default 4) + a circuit breaker (open after N consecutive failures, half-open probe on recovery). Pure, no I/O.
- [ai-client.ts](../../../../backend/engine/ai-client.ts): wrap the **live** provider call inside `callAI` with the guard. **Cassette replay bypasses both** (no network → no cap, no breaker) so tests/evals stay deterministic and $0.

## Not in this phase
- Tuning the exact cap/threshold numbers under real load (defaults for now).
- Any UI surfacing of breaker state.

## Done when
- [ ] Max concurrent live calls never exceeds the cap (unit test with fake async fns).
- [ ] Breaker opens after N consecutive failures and half-opens on a probe success (unit test).
- [ ] Replay path is unaffected — evals/tests still deterministic and $0.
- [ ] `npm test` green, `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Cap holds** — I run `npm test`; the concurrency test fires 10 fake calls with a cap of 4 and asserts no more than 4 ran at once. You should see it green. ❌ Not OK if >4 ran concurrently.
2. **Breaker trips** — the breaker test feeds repeated failures and asserts the breaker opens, then recovers on a success. Green. ❌ Not OK if it keeps calling through failures.
3. **Replay untouched** — the existing cassette/eval tests still pass unchanged. ❌ Not OK if replay now hits the guard.
