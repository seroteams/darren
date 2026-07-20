# Phase 3 — Rationale arc gate

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built (gate + tests), awaiting Carl's walk — one prompt line parked

## Built (overnight 2026-07-19)
- **`runRationaleArcGate`** in [golden-checks.ts](../../../backend/engine/golden-checks.ts) — in a relational arc (bi-weekly / feels-off), scans the per-turn `assessment.note` AND the briefing's per-axis `meaning` for competency/craft-gap framing (12 blatant tripwires: skills gap, competency, technical depth, below the bar, underperform, next-role readiness, …). **Detect-only — it surfaces a failure so the prompt gets fixed, it never rewrites the model text** (engine-honesty rule). Scoped to relational arcs exactly like the sibling focus/question/role-profile gates; competency framing stays legitimate in the `performance` arc.
- Wired into the eval harness as a new hard-fail `RATIONALE_ARC_LEAK` ([evals/trust-checks.ts](../../../evals/trust-checks.ts)), alongside the existing FOCUS/QUESTION/ROLE_PROFILE arc gates.
- **Proof ($0):** 6 co-located unit tests (fires on planted competency notes + meanings; quiet on clean behavioural text; silent in the performance arc; null-safe) — [golden-checks.rationale-arc.test.ts](../../../backend/engine/golden-checks.rationale-arc.test.ts). Offline sweep of **86 real July relational-arc runs (153 notes + 92 axis meanings): ZERO false positives.** Full suite 159/159, typecheck clean.

## ⚠️ Parked (needs the other lane free)
- The plan-turn prompt reminder line (register nudge for the note) lives in `content/prompts/plan-turn.md` — another chat's lane, same block as Phase 2's prompt edit. The gate stands on its own without it; the nudge is a belt-and-braces follow-up for when the lane frees.

## ✅ Original checklist status
- [x] Gate fires on a seeded competency note in a bi-weekly fixture, quiet on July's real relational-arc runs (86 runs, 0 flags).
- [x] `npm test` (159/159) + typecheck green.
- [ ] Product owner has tested the scenario below and said go.


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
