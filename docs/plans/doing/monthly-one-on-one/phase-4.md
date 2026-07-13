# Phase 4 — Sequential Feedback, manual Summary, private Review

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1 day

## Goal
The reflective stages get their real, persisted shape: feedback as a one-at-a-time Q&A, a manual summary, and the manager-only wrap-up with an engagement score — so a full Monthly Check-in can be finished end to end (AI arrives next phase).

## Changes
- Feedback stage (persisting the prototype behaviour): **sequential Q&A — Less of → More of → Learn** — one Sero question card at a time with its own notes + "Next question →"; answered questions stack above with a ✓; answers live in `state.feedback.{lessOf,moreOf,learn}` and survive reload mid-sequence (resume at the right question).
- Wrapup stage (UI label "Review"): the private pill ("Private — just for you. {name} never sees this stage."), engagement 1–5 with **"last time: N/5"** comparison (from the previous completed session's denormalised `engagement`), private notes. Suggestion buckets render only in Phase 5 (no empty AI shells this phase).
- Summary stage: structured manual notes area (AI draft replaces the starting point in Phase 5; the manager's edited text is always what's saved).
- `POST :id/complete` finishes the session for real: denormalises `state.wrapup.engagement` → the `engagement` column, sets `completed_at`, flips stage to `done`, applies promise outcomes + block scores (from P2/P3). A completed session reopens read-only at `/guided/:id` (interim view; the proper record is Phase 6).

## Not in this phase
- The AI call (Phase 5), record template + list merge (Phase 6), member lane (Phase 7).

## Done when
- [ ] `engagement` + `completed_at` populated on a completed session (query the table)
- [ ] `npm run typecheck` + `npm test` green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The Q&A rhythm** — Feedback: answer "less of", Next; answer "more of", Next; "learn" ends with "Continue to goals". Answered ones stack above with ✓. Reload after the first Next: you're on "more of" with "less of" answered above. ❌ Not OK if answers vanish or it restarts at question 1.
2. **The private wall** — Review names the person in the private pill. Set engagement 4, add a private note, finish. Nothing from this stage appears anywhere else.
3. **Last-time comparison** — next meeting, same person: Review shows "last time: 4/5". ❌ Not OK if wrong or missing.
4. **Finished means finished** — after Complete 1:1, reopening the URL shows the session read-only; the picker offers a fresh session for that person.
