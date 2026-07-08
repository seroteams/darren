# Phase 1 — Dampen repeated-fact deltas

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
When the same point is raised across several turns, the score should reflect *one* signal — not add up every time until the axis maxes out.

## Why
On the Maya run, clarity took a hit on turns 2, 3, 4, 5, 6, 7 — but every hit was the **same fact** (she ships main screens before checking the full flow / edge cases / empty states). Those hits stacked to the −10 floor and ended at −9, which the briefing then read as a "defining pattern." One repeated point should not floor an axis.

## Changes
- `prompts/plan-turn.md` (the per-turn scorer): add a rule that when an answer restates a fact already booked on an axis this session, the new delta **decays** — first mention scores full weight, repeats of the same theme contribute less (e.g. capped or halved each time).
- A genuinely *new* signal on the same axis still scores full weight — we damp repetition, not severity.

## Not in this phase
- The code-level confidence cap (Phase 2 — backstop in `src/reviewer.js`).
- Any change to which axis a point lands on (Parked P8).
- Changes to the briefing prompt wording (Phases 3–4).

## Done when
- [ ] On the Maya transcript, clarity lands mid-range instead of −9/−10.
- [ ] A one-off new signal still moves its axis by full weight (no over-damping).
- [ ] `npm test` passes; offline replay reproduces the improved score.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Maya re-run (the fix)** — replay the Maya scenario offline. The clarity score should no longer sit at −9/−10; it should land somewhere mid-range (e.g. around −4 to −6) off the same answers. ❌ Not OK if clarity is still −9/−10, or if it swings all the way to near-zero.
2. **New point still counts** — in a run where the employee raises a *different* clarity issue once, that point should still move the score normally. ❌ Not OK if real new signals barely register now.
3. **No-signal axes untouched** — wellbeing and engagement (never discussed in the Maya run) should still come out at 0 / "not enough signal". ❌ Not OK if damping changed an unprobed axis.
