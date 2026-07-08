# Phase 2 — Split queue-manager.ts

**Part of:** [PLAN.md](plan.md) · **Status:** 🔨 split complete — queue-manager 1309 → 434, every module < 600, verified; awaiting your QA

## Goal
Break the 1,309-line `queue-manager.ts` into focused files along its existing seams, leaving
`planTurn` as the orchestrator.

## Changes — all done, each a pure verbatim move (`planTurn` unchanged)
- [x] `delta-gates.ts` — shallow-answer / misalignment / recurring-gap-damper (2a).
- [x] `thread-follow.ts` + `queue-constants.ts` — thread-follow group + shared constants (2b).
- [x] `axis-coverage.ts` + `queue-metrics.ts` — coverage enforcement + transcript/arc metrics (2c).
- [x] `messages.ts` — plan-turn prompt assembly (2d).
- [x] `reconcile-queue.ts` — queue reconciliation + grounding gate + axis-delta coercion (2e).

Result: `queue-manager.ts` **1309 → 434** lines (−67%); now just the `planTurn` orchestrator + AI
plumbing + clamp/drill-cap. Every engine module is under 600 (largest extracted: reconcile-queue 245).

## Not in this phase
- The controller split (Phase 3). Any change to *which* questions are chosen — pure move only.

## Done when
- [x] `npm test` green (46/46); `npm run typecheck` clean (after every cut).
- [x] No file in the set is over ~600 lines — queue-manager 434; largest extracted module 245.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Same questions** — run a session to the question stage; the questions and their order
   behave exactly as before. ❌ Not OK if the picks or order change.
2. **Tests** — `npm test` still 46/46.
