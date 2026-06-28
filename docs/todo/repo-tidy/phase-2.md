# Phase 2 — Split queue-manager.ts

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 in progress — 2 of 3 seams extracted (verified), awaiting your QA

## Goal
Break the 1,309-line `queue-manager.ts` into focused files along its existing seams, leaving
`planTurn` as the orchestrator.

## Changes
- [x] `delta-gates.ts` — shallow-answer / misalignment / recurring-gap-damper (Phase 2a, ~160 lines).
- [x] `thread-follow.ts` + `queue-constants.ts` — runtime thread-follow group + shared constants (Phase 2b, ~110 lines).
- [ ] `axis-coverage.ts` (+ `queue-metrics.ts` it depends on) — **next cut**.
- [ ] Optional further cuts to get under ~600: `reconcile-queue.ts`, `messages.ts`.

So far: `queue-manager.ts` **1309 → 1036** lines; each cut a pure verbatim move, `planTurn` unchanged.

## Not in this phase
- The controller split (Phase 3). Any change to *which* questions are chosen — pure move only.

## Done when
- [x] `npm test` green; `npm run typecheck` clean (after each cut).
- [ ] No file in the set is over ~600 lines — **not yet** (queue-manager 1036; needs axis-coverage + reconcile/messages cuts).
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Same questions** — run a session to the question stage; the questions and their order
   behave exactly as before. ❌ Not OK if the picks or order change.
2. **Tests** — `npm test` still 46/46.
