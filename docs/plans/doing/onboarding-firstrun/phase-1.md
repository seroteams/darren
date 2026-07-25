# Phase 1 — One first-run rule

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The intake wizard's beginner help shows for genuinely new managers again, and "has real 1:1s" is decided in exactly one place.

## Changes
- `admin/src/stages/start-rows.ts` — add a shared helper (working name `hasRealRuns(runs)`) next to `rowModel`, counting only non-demo runs.
- `admin/src/stages/start-core.js` — Home's first-run check calls the helper (same behaviour as today, one source).
- `admin/src/stages/intake.js` — the wizard's first-run gate calls the helper instead of counting raw rows (this is the bug fix: today the seeded Sofia example makes every new account look like a veteran).
- Tests first: extend `start-core.test.ts` + a wizard-gate test proving a demo-only account counts as first-run.

## Not in this phase
- Any visual change to Home or the wizard (Phase 2).
- Any sidebar change (Phase 3).
- demo-member P2's "Remove example" (its own plan; it will call the same helper later).

## Done when
- [ ] A demo-seeded fresh account is treated as first-run by BOTH Home and the wizard (verified in the running app, not just tests).
- [ ] `npm test` and `npm run typecheck` clean; no other behaviour moved.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **New account sees the beginner help** — `live > sero.team > register a fresh test account (e.g. carl+8@seroteams.com) > Start your first 1:1`. On "Who are you prepping for?" you should see the "Your first prep, in three moves" panel beside the form. ❌ Not OK if the step shows only the form.
2. **Notes step teaches** — continue to the notes step ("Anything Sero should know?"). You should see the "What good notes look like" example under the text box.
3. **Nothing else moved** — go back Home: still the "First time?" card, the one blue button inside it, and the Sofia row with its Example tag, exactly as before.
4. **Veterans unchanged** — log in as your normal account (has real 1:1s): no beginner panels anywhere.
