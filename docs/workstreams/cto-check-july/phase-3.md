# Phase 3 — The questions: grounded or generic?

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## The question
Are the **questions** Sero produces specific and grounded in the little the manager gave — the kind that
make a 1:1 land — or generic filler you'd get from any template?

## What I'll inspect
- The questions from the Phase 1 thin case + a few more from `logs/**`.
- The question logic: `question-generator.ts`, the `question-bank` / `questioning` stages, `question-validator.ts`, plus the dedup + eligibility gates.
- Judged on: **specific** (tied to this person / situation, not boilerplate), **grounded** (follows from the input), **safe** (validator catches broken / leaky stems), **useful** (a manager would actually ask them).

## Deliverable → `findings-3.md`
- The real questions from a thin run, quoted, tagged **specific vs. generic**.
- Blunt verdict: **good questions on thin input — yes / not yet.**
- The **#1 weakness** (e.g. drifts generic when input is thin) + cheapest fix.

## Not in this phase
- The brief (Phase 2) or summary (Phase 4). Building fixes.

## Done when
- [ ] `findings-3.md` quotes real questions and tags them specific / generic.
- [ ] Clear yes / not-yet verdict + #1 weakness.
- [ ] Carl has read it and said go.

## Test scenarios — for the product owner (Carl)
1. **Read the questions** — would you actually ask them? Which feel generic?
2. **Grounding check** — the report should show the good ones tracing back to the input.
3. **Honesty test** — if thin input yields generic questions, the report must say so, not spin it.
4. **Green-light or dig** — "go" for Phase 4, or point me at the question stage to dig into.
