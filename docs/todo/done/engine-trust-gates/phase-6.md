# Phase 6 — Briefing confidence honesty

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 coded, offline green 2026-06-13 (new test-confidence-honesty.js: concentration guard caps/keeps confidence correctly; rule-echo forces low + flags + does not rewrite). Live `--judge` gate + product-owner walk-through pending.

**Deviation:** `UNGROUNDED_MEANING` (zero rare-token overlap with transcript) was NOT shipped — it's speculative, prone to false WARNs on legitimate paraphrased meanings, and can't be safely tuned without a live gate run (quota-blocked). Parked. The concrete observed bug (the "rushed handoffs and timelines" rule-echo) is fully covered by `RULE_ECHO_MEANING` + the runtime confidence downgrade.

## Goal
Overconfident axis reads get machine-readable downgrades, and meaning text that echoes prompt-rule examples ("rushed handoffs and timelines") instead of this session's words is flagged — never silently rewritten.

## Changes
- `src/reviewer.js` (`applyAxisConfidence`, ~271-346): concentration guard in code — if an axis score has magnitude ≥5 but rests on ≤2 distinct answer excerpts, cap `confidence` at `medium` and set `evidence_basis: "concentrated_signal"`. Fields only; do **not** extend the existing phrase-softening (no-masking rule).
- `prompts/final-evaluation.md` (`wellbeing_evidence_rules`): the rule examples ("rushed", "tight timelines", "running hot"…) are vocabulary for what to *exclude* — never copy them into `meaning`. Every `meaning` must quote or closely paraphrase this transcript, or plainly say there isn't enough signal.
- `src/golden-checks.js` + `evals/trust-checks.js`: `runMeaningGroundingCheck` — a `read` axis whose meaning shares no rare content words with the transcript+note → **`UNGROUNDED_MEANING`** (WARN); a ≥3-content-word phrase lifted verbatim from the rule examples → **`RULE_ECHO_MEANING`**. When flagged at runtime: downgrade that axis's `confidence` to `low` and log — the sentence ships as the model wrote it.
- Ordering: the not_read caption replacement (reviewer.js ~334-338) must run after the new downgrades.

## Not in this phase
- Any prose rewriting. Ever.

## Done when
- [ ] `npm run gate --judge` + `npm run eval` run; deterministic checks green; judge WARNs reviewed with the product owner
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The phantom sentence is gone** — re-run two of the runs that shipped "rushed handoffs and timelines" (e.g. the June 3 Maya scenarios). The phrase should not appear — or if the model still writes it, the run shows a `RULE_ECHO_MEANING` flag and that axis ships at low confidence. ❌ Not OK if it ships unflagged at normal confidence.
2. **One fact ≠ a pattern** — re-run the Machar bi-weekly (wellbeing was scored -5 off "got a cold"). Wellbeing should now ship at reduced confidence with `evidence_basis: concentrated_signal`, and the briefing should read softer. ❌ Not OK if near-zero signal still produces "act on it" framing.
3. **Real signal keeps its strength** — run a persona with 3+ genuinely different wellbeing statements. Confidence should stay high. ❌ Not OK if the guard waters down well-evidenced reads.
