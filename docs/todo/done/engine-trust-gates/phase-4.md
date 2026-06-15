# Phase 4 — Relational-arc gate at the question layer

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 coded, offline green 2026-06-13 (unit 22/22 incl. QUESTION_ARC_LEAK fires/holds; prompt rules verified to inject only for relational arcs). Live bi-weekly case run + product-owner walk-through pending.

## Goal
Bi-weekly and "Something feels off" sessions can never serve a competency/readiness question — the same two-layer protection (input filter + detect gate) the focus points already have.

## Changes
- `prompts/generate-questions.md`: arc-rules block (injected like the existing `<meeting_arc>` section) — for relational arcs, `purpose` must be `wellbeing` or `topic`, and no question may ask the report to *prove* anything (no "trust you in that next role" / readiness-evidence framing).
- `src/question-generator.js` (post-parse): when `isRelationalArc(meetingType)`, drop generated items with `purpose: "competency"` before saving, with a logged gate line — mirrors `catalogueForArc` in `src/generate.js`.
- `src/queue-manager.js`: `enforceAxisCoverage` excludes competency candidates for relational arcs; `reconcileQueue` rejects planner-added competency items for relational arcs (logged).
- `src/golden-checks.js` + `evals/trust-checks.js`: `runQuestionArcGate` — any *served* `purpose: competency` question in a relational arc fails; hard-fail gate **`QUESTION_ARC_LEAK`**, sitting beside `FOCUS_ARC_LEAK`.

## Not in this phase
- Catching evaluative *wording* on questions labelled `topic` (like `q_behavior_evidence`) — the purpose field is only as honest as its label. The prompt rule + Phase 1's pool filter cover the known case; prose-level detection is parked.

## Done when
- [ ] `npm run gate` green, with a new synthetic leak sentinel failing as designed
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Bi-weekly stays relational** — run the Maya bi-weekly persona (the June 10 scenario where "trust you in that next role" shipped). Read every question: nothing should ask her to prove readiness, leadership, or skills. ❌ Not OK if any question feels like an assessment.
2. **Feels-off stays relational** — run the Rachel "something feels off" persona. Same check, plus: ask me for the focus-points stage log — no competency focus point should have been generated or selected.
3. **Performance reviews still work** — run a Performance & feedback persona. Competency questions should still flow freely there. ❌ Not OK if the gate bleeds into meeting types where skills talk belongs.
