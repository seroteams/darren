# Phase 3 — Decision tables for the three Carl-gated calls

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested) · **Run order:** 3rd

## ✅ GREEN-LIT 2026-07-08 — Carl walked the 3 table scenarios (commit hash in the tracker stamp)

## Built (2026-07-08)
- **[docs/reference/agent-decisions.md](../../reference/agent-decisions.md)** (new) — the three tables in one page:
  - **Table A (paid run?)** — the 6-rung free ladder (now incl. Phase 1's offline pipeline replay + repro-from-bundle), then a justified-conditions table. Only three situations justify the one allowed run (new prompt *rule*, never-recorded scenario, model/provider change); logic changes never do. 2nd runs and full gates always escalate.
  - **Table B (flag / retry / refuse)** — five problem classes, what an agent may do alone vs never (the honesty rule made operational: gates block, shapes retry-then-honest-fallback, weak-but-valid ships flagged, bad-reading gets detectors, NEW live-path behaviour is proposal-only). B2 + stonewall stay explicitly PARKED as Carl's decisions, with the agent defaults framed as proposals. Litmus line: "would this make output LOOK better without the read being better? → masking → no."
  - **Table C (good enough?)** — 7-check 🟢/🟡/🔴 rubric built from the No-Inference thresholds (<15-token caution, evidence anchor, no inferred states) + honesty fields + honest-thin-vs-padded + question grip + summary truth.
- **Cross-links added** in [guardrails.md](../../reference/guardrails.md) under guardrails 3 and 4 (two "Agent playbook" pointers — no other guardrails text touched).
- **Pre-walked against history (my side of QA):** Table A lands the cto-check "prove the questions" fork on the same call Carl made (justified, one case, ~$0.35 — he then timed it himself); Table C's calibration row reproduces all three cto-check verdicts (brief 🟢, specific-note questions 🟢, vague-note questions 🟡). Both walks are written INTO the doc so they stay checkable.
- Docs only — no code, no tests affected, $0.

## Goal
The three judgments that recur in every workstream become written tables an agent can resolve on its own, so only the true edge cases reach Carl.

## Why
`docs/reference/guardrails.md` deliberately routes these back to Carl rather than encoding them. That's the single biggest source of "stop and ask" moments.

## Changes — three tables under `docs/reference/`, cross-linked from `guardrails.md`
- **a. "Is a paid run really needed?"** — a decision tree. Free checks to exhaust first (typecheck, lint, `npm test`, `replay-scenario --fixtures-only`, and now Phase 1's offline replay); a paid run is justified only when a named condition holds (e.g. "behaviour depends on a live model choice no cassette covers"). This is the most frequent Carl-gated moment.
- **b. Live-path behaviour-change policy** — turns the standing "honesty — detect, never silently rewrite" rule into a concrete "flag vs refuse-to-ship" table, resolving the parked `engine-improvements` B2 (refuse-to-ship weak brief) and #1 (stonewall-exit) into a rule an agent can propose against.
- **c. "Good enough" output rubric** — turns the cto-check 🟢/🟡 prose into a written rubric (honest-thin vs padded; evidence-anchored vs inferred), leaning on the numeric thresholds already in `docs/reference/prompt-improvement-spec.md`.

## Not in this phase
- Any code change. This is documentation that captures Carl's judgment — the honesty/no-masking rule still governs, and behaviour-change items (b) stay proposals until Carl green-lights them.

## Reuse
`docs/reference/prompt-improvement-spec.md` (an existing real decision table), `docs/reference/guardrails.md`.

## Done when
- [ ] Three tables exist and are linked from `guardrails.md`.
- [ ] Each is concrete enough to walk a real past decision through and land on the same call.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
Walk these yourself. Next phase waits for your green light.
1. **Paid-run tree** — pick a past workstream that ended on "say the word to spend $0.35." Walk its situation down the new tree. It should land on the same call you actually made. ❌ Not OK if the tree says "spend" where you'd have said "no" (or vice versa).
2. **Live-path table** — read table (b). Does it match how you'd want the engine to behave on a weak brief (flag vs refuse)? ❌ Not OK if it green-lights silent rewriting.
3. **Good-enough rubric** — take one thin-input brief you've judged before. Score it with the rubric. It should land on the same 🟢/🟡 you gave it. ❌ Not OK if padded output scores as "good."
