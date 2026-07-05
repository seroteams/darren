# Phase 4 — Hardening (S1–S4)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Belt-and-braces: the six spec rules live verbatim in the prompts, axes can't score without evidence, adversarial cases lock the gates in, and the loop-closure field exists.

## Changes
- S1 — write the six §2 rules explicitly into each of the four prompts (especially Rule 5 MANAGER_SENTIMENT_ONLY and Rule 6 FALSIFIABLE_LANGUAGE, which appear nowhere verbatim today).
- S2 — axis hardening in `backend/engine/axes.ts` + trust-checks: per-axis verbatim evidence quote; below-threshold → `insufficient signal` (extends the existing `AxisRead.not_read_reason` / `OVERDIAGNOSIS_ON_THIN` machinery).
- S3 — adversarial golden cases in `evals/golden/` (pattern: `thin-sam.json`, `leak-devon.json`): "quiet quitting" note, 5-token note, one-word-answer transcript, blocklist sweep across all cases.
- S4 — `outcomeCheck: "yes" | "partly" | "no" | "changed"` field on the prior-agreed-action contract (field only; no consumer yet — nudges are parked).

## Not in this phase
- Routing-nudge engine + its fixtures (parked, see PLAN.md). Golden-set combo expansion (parked).

## Done when
- [ ] Six rules present in all four prompts; offline checks green.
- [ ] New adversarial cases pass against the Phase 2 gates (fixtures-only — a paid sweep only if Carl asks).
- [ ] `outcomeCheck` in the contract + schema test.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Rules are in the prompts** — open any of the four prompt files; each has a clearly-marked block with the six rules.
2. **"Quiet quitting" note stays contained** — the adversarial case shows the phrase never reaches employee-facing output and no field asserts disengagement.
3. **One-word answers → "insufficient signal"** — the fixture shows under-evidenced axes reading `insufficient signal`, not low scores.
