# Phase 2 — Let a genuine new thread mint under pressure

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Stop the engine going deaf exactly when the person is opening up. Today thread-follow bails the moment `consecutiveDrillCount >= 2` — but "the person keeps volunteering" looks identical to "we keep drilling one point." Tell the two apart: **follow a genuine NEW thread** even under drill pressure, while still capping true same-point over-drilling.

## Changes
- `backend/engine/thread-follow.ts` (101-104) — replace the blanket `consecutiveDrillCount >= 2` bail with a check that still mints when the last answer opens a **new** thread (a topic not already being drilled), and only suppresses when the follow-up would drill the *same* narrow point again. Keep the `remainingBudget <= 2` guard (near the end, no room) and the existing repeat/asked guards.
- Tests: `backend/engine/thread-follow.test.ts` (or wherever its unit tests live) — lock both directions: a new thread under drill pressure DOES mint; a same-point re-drill under pressure does NOT.

## Not in this phase
- The pinning fix (Phase 1) — assumed landed and green.
- Broadening the metric (`scoreThreadFollow`) — parked.

## Done when
- [ ] Unit tests lock both directions (new-thread mints; same-point re-drill suppressed).
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] **ONE paid gate case** (~$0.35, the smallest proof — e.g. `node scripts/gate.js --only performance-tom`, whose baseline was 0.25): `plan_thread_follow` moves up vs the last-night baseline **with zero new leakage/coverage hard-fails**. (Cost stated up front; second run needs Carl's explicit go.)
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself. All but #3 are free.
1. **New thread gets followed** — I show a unit case: the person opens a brand-new topic after we'd been drilling something else; the engine now mints a follow-up on the new topic. ❌ Not OK if it still bails.
2. **Over-drilling still capped** — I show the opposite case: the person keeps circling the *same* narrow point; the engine does NOT keep drilling it. ❌ Not OK if this now runs away drilling one thing.
3. **The number moves (one paid run, ~$0.35)** — one gate case: `plan_thread_follow` is higher than last night's baseline for that case, and no new leakage or coverage failure appears. ❌ Not OK if the metric is flat, or if any leakage/coverage hard-fail is now red.
