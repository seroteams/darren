# Phase 3 — Decision tables for the three Carl-gated calls

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Run order:** 3rd

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
