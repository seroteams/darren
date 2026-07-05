# Phase 2 — The three gates (M3 + M4 + M5)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The ruling is mechanically enforced: any output asserting an internal employee state, un-anchored claim, or state-read from thin input fails the gate.

## Changes
- `evals/trust-checks.ts` — three new hard-fail gates, following the existing `PRIVATE_NOTE_LEAK` / `ENGINE_VOCAB_LEAK` patterns:
  - `INFERRED_STATE_LEAK`: blocklist of state-assertion phrasings (disengaged, burned out, checked out, flight risk, unreliable, avoiding feedback, low ownership…) + check that state words in output appear in the manager's input. Two design rules from the external review:
    - **Surface rule:** input-anchored state words (the manager typed them) are permitted in **manager-facing output only** — on employee-facing surfaces `PRIVATE_NOTE_LEAK` still applies, so this gate can't become a leak path.
    - **Temporary carve-out:** the gate checks **prose output fields**; the legacy `engagement_read.level` enum tokens (`worth_checking`, `clear_concern`) are exempted with a dated comment, so the gate doesn't red-line the current system before Phase 3 re-specs the field. Phase 3 removes the carve-out.
  - `THIN_INPUT_SUPPRESSION`: manager free-text <15 tokens AND output contains any state/wellbeing claim, or doesn't use fallback/cautious mode. **Definition:** the <15-token floor measures the **manager's total free-text notes for the session** (the pre-meeting input), evaluated once at pipeline start — separate from plan-turn's per-answer <3-token "shallow" rule, which stays unchanged.
  - `EVIDENCE_ANCHOR`: any focus point / risk / listen-for not matchable to manager input text or a structured event ID.
- All four prompts in `content/prompts/` — the <15-token thin-input rule (today only plan-turn's <3-token "shallow" rule and focus-points' sparse-notes branch exist).
- Focus-point + briefing contracts — schema-enforced source-reference field (copy the pattern from plan-turn's `grounding` field, `content/prompts/plan-turn.md:318`).
- Unit tests for each gate (test-first, offline fixtures — no paid runs).

## Not in this phase
- `engagement_read` redefinition (Phase 3). Adversarial golden cases (Phase 4). Routing nudges (parked).

## Done when
- [ ] Three gates exist, each with a failing-then-passing test.
- [ ] `npm test` green (minus the pre-existing scenario-pack failure).
- [ ] Fixtures-only replay shows the gates evaluating real outputs.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Poisoned note is caught** — I'll show a test where output containing "they seem disengaged" (not in the manager's note) trips `INFERRED_STATE_LEAK` = FAIL. You should see the fail; the same text present in the manager's own note passes.
2. **Thin note is caught** — a 5-token note producing a wellbeing claim trips `THIN_INPUT_SUPPRESSION`.
3. **Un-anchored focus point is caught** — a focus point with no input quote / event reference trips `EVIDENCE_ANCHOR`.
4. **Nothing else broke** — `npm test` count same-or-higher, all green except the known pre-existing failure.
