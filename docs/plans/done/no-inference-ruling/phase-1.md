# Phase 1 — Fix the spec + docs rule (M1 + S5)

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ (green-lit by Carl 2026-07-05 — "go please")

## Goal
The spec points at the code that actually exists, so Phases 2–4 (and any future session) build against reality.

## Changes
- [docs/reference/prompt-improvement-spec.md](../../../reference/prompt-improvement-spec.md) §3 final-evaluation: replace the `disengagementSignal` rename order with a re-spec of the real field, `engagement_read` (`backend/shared/briefing.types.ts:16-22`) — its `level` values (`worth_checking`, `clear_concern`) are the live state-read the ruling hits.
- Same file §5: correct "extend the 36-combo matrix" to the real setup — 8 scenario-based golden cases in `evals/golden/` — and re-word test assertion 6 to target `engagement_read`.
- Same file: note the existing gate file (`evals/trust-checks.ts`) as home for the three new gates.
- CLAUDE.md §6 (or spec §6): the "never train or fine-tune on manager notes" standing rule (S5).

## Not in this phase
- No code changes. No gates, no prompt edits, no contract edits (Phases 2–4).

## Done when
- [x] Spec has zero references to `disengagementSignal` as a live field; every §3 final-evaluation instruction names `engagement_read`.
- [x] Spec's test section describes the real 8-case golden set.
- [x] "Never train on manager notes" is a written standing rule.
- [x] Product owner has read the changed sections and said go. (2026-07-05)

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Spec points at real code** — open [docs/reference/prompt-improvement-spec.md](../../../reference/prompt-improvement-spec.md), find the final-evaluation section. It should talk about `engagement_read` and what to change it into. ❌ Not OK if `disengagementSignal` still appears anywhere as a field to rename.
2. **Test section is honest** — the test section should say we have 8 golden test cases today (not a "36-combo matrix"). ❌ Not OK if it still assumes a matrix that doesn't exist.
3. **The training ban is written down** — CLAUDE.md §6 has a one-line rule that manager notes are never used for training/fine-tuning.
