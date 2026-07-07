# Phase 4 — Admin TypeScript pilot

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Prove the admin SPA can move to TypeScript cleanly: convert the shared util layer and 2–3 stage
modules, set up the toolchain, and leave a repeatable recipe. (Converting all 47 stages is a
separate, later plan — see Parked in PLAN.md.)

## Changes
- Add TS build + typecheck for `admin/src`. Convert the shared helpers and 2–3 stage files to
  `.ts`.
- Write a short "how to convert a stage" note for the rest.

## Not in this phase
- The other ~44 stages. Any UI or behaviour change.

## Done when
- [ ] Converted files typecheck; the admin app builds and runs unchanged.
- [ ] A short recipe exists for converting the remaining stages.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **UI unchanged** — `npm run dev`, click through the converted stages; looks and works
   exactly as before. ❌ Not OK if anything shifts visually or breaks.
2. **Build** — `npm run build` succeeds.
