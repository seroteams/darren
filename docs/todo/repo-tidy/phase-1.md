# Phase 1 — Shared guards + drop the .mjs oddity

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
One copy of the small type-guards, and no stray `.mjs` in the TypeScript engine.

## Changes
- New `backend/shared/guards.ts` exporting `isObjectRecord`, `asRecord`, `asString` (and any
  identical siblings). Replace the ~34 local copies with an import.
- Convert `backend/engine/run-debrief.mjs` (+ its hand-written `.d.mts`) to `run-debrief.ts`.

## Not in this phase
- Any file splitting (Phases 2–3). Any behaviour change at all — this is a pure move.

## Done when
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] grep shows the guards defined once, imported everywhere else.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **App still runs** — `npm run dev`, do a normal run through a stage. Same as before.
   ❌ Not OK if anything errors.
2. **Tests** — `npm test` shows the same count green as before (46/46).
