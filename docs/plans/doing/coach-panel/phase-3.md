# Phase 3 — Rationale arc gate

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The score "why" lines can never carry performance-review framing into the two relational meeting types (bi-weekly check-in, something-feels-off) — closing the gap the research flagged: today nothing checks the free-text rationale, and the split panel makes it prominent.

## Changes
- A FOCUS_ARC_LEAK-style check in `backend/engine/golden-checks.ts` for `assessment.note` (and the briefing's per-axis `meaning`) in relational arcs — flag competency/craft-gap framing, surface it, never silently rewrite (engine honesty rule).
- A line in the plan-turn prompt's assessment rules reminding the model of the relational-arc register for the note.
- Tests alongside the existing arc-gate tests.

## Not in this phase
- Any UI change.
- Gating axis NUMBERS (they're meeting-type-neutral by design).

## Done when
- [ ] The gate fires on a seeded competency-flavoured note in a bi-weekly fixture, and stays quiet on July's real relational-arc runs (checked offline from logs — $0).
- [ ] `npm test` + typecheck green.
- [ ] Product owner has tested the scenario below and said go.

## Test scenarios — for the product owner
1. **The demo** — I'll show you two run reviews side by side: one where the gate stayed quiet (normal run) and one where it flagged a planted performance-flavoured line in a bi-weekly. You should be able to tell at a glance what it caught and why that matters for trust. ❌ Not OK if you can't see what tripped it.
2. **Nothing rewritten** — in the flagged run, the original model text is still visible (flagged, not replaced).
