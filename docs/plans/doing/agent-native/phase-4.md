# Phase 4 — Orchestrator parity guard

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Run order:** 4th

## Goal
A test fails the moment the web and CLI stage sequences drift apart, so an agent can't half-change the pipeline.

## Why
The stage chain is wired twice with no shared orchestrator: web at `backend/api/services/sessions/session-streams.ts`, CLI at `backend/engine/cli/stages/*` (5 files). A stage-wiring change must edit both, and only the paid gate catches a mismatch today.

## Changes
- **`backend/engine/`** — export a declarative `STAGE_SEQUENCE` (ids + order + prompt-stage mapping) from the facade `index.ts`. Canonical stage list already lives at `backend/engine/models.ts:8`.
- Have both orchestrators reference that constant (or, minimally, derive their order from it).
- **New offline test** — asserts the web path and the CLI path produce the same ordered stage sequence; fails if they diverge.

## Not in this phase
- **Merging** the two orchestrators into one — bigger and riskier, parked. This phase only *guards* parity.

## Reuse
`backend/engine/models.ts:8` (canonical stage list), `backend/engine/index.ts` (facade).

## Done when
- [ ] `STAGE_SEQUENCE` is exported and both paths reference it.
- [ ] A new offline test passes on the current code and **fails** if either path's stage order is hand-broken.
- [ ] `npm test` includes it.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
Walk these yourself. Next phase waits for your green light.
1. **Passes clean** — run `npm test`. The new parity test passes. ❌ Not OK if it fails on untouched code.
2. **Catches drift** — I'll temporarily reorder one stage in the CLI path and re-run `npm test`. You should see the parity test go red with a clear message naming the mismatch. Then I revert. ❌ Not OK if it stays green.
