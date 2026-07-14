# Phase 4 — Sequential Feedback, manual Summary, private Review

**Part of:** [plan.md](plan.md) · **Status:** ✅ · **Size:** ~1 day

## ✅ GREEN-LIT 2026-07-13 (sign-off delegated — Carl "go to end")
Most of P4 landed already in P1/P3 (sequential feedback with reload-resume, engagement 1–5, summary
notes, and a `complete()` that denormalises engagement + sets completed_at + applies outcomes/scores).
This phase added: `engagement` on the DTO + the Review **"Last time: N/5"** line (from the previous
completed session), and a **completed read-only banner**. Shipped `2502dd7a`. Verified: typecheck clean ·
131/132 · admin build resolves · real-DB round-trip (engagement=4 + completed_at denormalised, readable by
a later session). Walk still pending Carl.

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
- [x] `engagement` + `completed_at` populated on a completed session — verified via real-DB round-trip (engagement=4 denormalised, completed_at set, stage=done)
- [x] `npm run typecheck` + `npm test` green (typecheck clean · 131/132; 1 known-env `test-persona-bench`)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The Q&A rhythm** — Feedback: answer "less of", Next; answer "more of", Next; "learn" ends with "Continue to goals". Answered ones stack above with ✓. Reload after the first Next: you're on "more of" with "less of" answered above. ❌ Not OK if answers vanish or it restarts at question 1.
2. **The private wall** — Review names the person in the private pill. Set engagement 4, add a private note, finish. Nothing from this stage appears anywhere else.
3. **Last-time comparison** — next meeting, same person: Review shows "last time: 4/5". ❌ Not OK if wrong or missing.
4. **Finished means finished** — after Complete 1:1, reopening the URL shows the session read-only; the picker offers a fresh session for that person.
