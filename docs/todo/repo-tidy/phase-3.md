# Phase 3 — Split sessions.controller.ts

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜
**Sequencing:** Run **after** Phase 005 has swapped the sessions repo to Postgres, so the two
changes don't fight over the same files.

## Goal
Make `sessions.controller.ts` (651 lines) a thin controller and move its orchestration into a
`sessions.service.ts`, matching every other domain.

## Changes
- New/extended `sessions.service.ts` holds the engine orchestration (plan-turn, evaluate, queue
  assembly, deltas). The controller just parses → calls the service → maps the result.

## Not in this phase
- Engine internals. Storage (that is Phase 005's job).

## Done when
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] The controller has no direct `engine/` orchestration calls.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Full run** — drive a session from start to briefing in the app; identical behaviour to
   before. ❌ Not OK if any step behaves differently.
2. **Tests** — `npm test` still green.
