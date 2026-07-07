# Phase 1 — Pick the thin case & trace it

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Lock the exact **thin-input** run we'll judge, and map where the three outputs (brief, questions, summary)
each come from — so Phases 2–4 all judge the same real example.

## What I'll do
- Load the **`thin-sam`** fixture (`evals/replay/thin-sam/input.json`, `evals/golden/thin-sam.json`) — the built-in "very little info" case — plus 1–2 real thin runs from `logs/**/05-evaluation/final.json`.
- Confirm it's genuinely thin (show how little the manager actually gave).
- Trace, in plain words, which part of the output is the **brief**, which are the **questions**, and which is the **summary** — and which engine stage produces each.

## Deliverable → `findings-1.md`
- The chosen thin input, quoted — exactly how little was given.
- A one-glance map: little input → brief / questions / summary (which stage makes each).
- Confirmation this is free (existing logs) + a note if Carl would rather judge a fresh live run.

## Not in this phase
- Judging quality yet (that's 2–4). This only sets the shared example everyone else is measured against.

## Done when
- [ ] `findings-1.md` names the thin case + shows how thin it is.
- [ ] The brief / questions / summary are clearly located in the real output.
- [ ] Carl has read it and said go (and confirmed thin-sam is a fair example, or named a better one).

## Test scenarios — for the product owner (Carl)
1. **Read it** — you should agree *"yes, that's a realistically thin amount of info."*
2. **Spot-check** — open `evals/replay/thin-sam/input.json`; confirm it's as thin as the report says.
3. **Fair example?** — if thin-sam isn't like your real early users, say so and I'll pick another run.
4. **Green-light or swap** — "go" for Phase 2 (the brief), or point me at a different run to judge.
