# Phase 1 — Shared guards + drop the .mjs oddity

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built + verified (typecheck + 46/46), awaiting your glance

## Goal
One copy of the small type-guards instead of ~34 — a pure, behaviour-preserving move.

## Changes
- New `backend/shared/guards.ts` exporting `isObjectRecord`, `asRecord`, `asString`. Replaced the
  38 local copies with an import (done 2026-06-28).

**Dropped from this phase:** converting `run-debrief.mjs` → `.ts`. Its `.d.mts` header and
`admin/src/ui/run-debrief.js` confirm it's deliberately plain ESM, **shared with the Vite browser
build** (`@sero/run-debrief`). Converting it would break the admin build. Left as-is by design.

## Not in this phase
- Any file splitting (Phases 2–3). Any behaviour change at all — this was a pure move.

## Done when
- [x] `npm test` green (46/46); `npm run typecheck` clean.
- [x] grep shows the guards defined once, imported everywhere else.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **App still runs** — `npm run dev`, do a normal run through a stage. Same as before.
   ❌ Not OK if anything errors.
2. **Tests** — `npm test` shows the same count green as before (46/46).
