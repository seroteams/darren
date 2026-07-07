# Phase 2 — Universe honest ring

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
The Universe's pipeline ring stops being a private hand-typed copy: it derives from the app's real flow, and the Update button reports stage changes.

## Changes
- `admin/src/stages/universe.ts` — the `PIPELINE` ring derives from the router's real flow stages (intake → … → briefing) instead of its own hardcoded list; keep the friendly one-line subs as a lookup keyed by stage
- The "Update from the engine" button also diffs the ring vs the last snapshot and says "pipeline stage added/removed/renamed: …"
- `universe.test.ts` extended for the derivation

## Not in this phase
- Tasks board (phase 3)
- Any visual changes to the 3D rendering

## Done when
- [ ] `npm test` green · no new typecheck errors
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Same universe** — open /universe. The ring shows the same 7 steps as before, labels intact.
2. **Update still real** — finish (or clone) a run, click **Update from the engine**. The new run appears and is called out, exactly as today.
3. **Ring honesty (with me)** — I'll temporarily add a fake stage to the flow in a branch; Update should announce "pipeline stage added". ❌ Not OK if the ring stays at 7 silently.
