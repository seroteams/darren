# Phase 2 — Split queue-manager.ts

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Break the 1,317-line `queue-manager.ts` into focused files along its existing seams, leaving
`planTurn` as the orchestrator.

## Changes
- Extract `axis-coverage`, `delta-gates` (shallow / misalignment / damper), and `thread-follow`
  into their own engine modules; `queue-manager.ts` imports them.

## Not in this phase
- The controller split (Phase 3). Any change to *which* questions are chosen — pure move only.

## Done when
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] No file in the set is over ~600 lines.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Same questions** — run a session to the question stage; the questions and their order
   behave exactly as before. ❌ Not OK if the picks or order change.
2. **Tests** — `npm test` still 46/46.
