# Phase 4 — Back-to-question navigation

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 in progress · Phases 1–3 approved & committed.

## Goal
The manager can step back one question, fix the answer (typos, missed half a sentence), and the session carries on from the corrected answer.

## Spec — confirmed with Carl 2026-06-15
1. **Only the immediately previous answer is editable?** Back always lands on the
   *immediately previous* answer — no history browser. It is repeatable: after
   amending and advancing, Back targets the new previous answer. (Supersedes the
   old "after the next answer you can't edit the older one" wording — stepping
   back one turn at a time is allowed; jumping arbitrarily is not.)
2. **What happens to a question already generated from the old answer?** Discarded
   and regenerated from the amended answer — full **discard & re-run** of the turn
   (score deltas, re-planned queue, agenda carry-forward all reverted).
3. **Revision or overwrite?** The shipped transcript carries the amended answer.
4. **Does the run log keep the original answer?** Yes — each back appends the
   discarded turn (question alias + original answer) to `amend-log.json`.
5. **What if the discarded question was a thread-follow?** The planner re-plans
   from the amended answer; if no grounded thread-follow exists, none is injected
   (same skip rule as Phase 1).

## How it works
- **Snapshot before mutate.** `plan.js` pushes a deep copy of the turn-affecting
  session state (`queueRef`, `turn`, `axisState`, `transcript`, `totalBudget`,
  agenda flags, the question being answered, the answer text) onto
  `session.turnSnapshots` *before* it shifts the queue, scores, and re-plans.
  Idempotent replays of an already-planned turn do **not** push a new snapshot.
- **Restore on back.** `POST /api/back` pops the last snapshot, restores those
  fields, clears the cached plan for the undone turn (`lastPlanByTurn`), logs the
  discarded answer, and returns the prior answer text + restored axes.
- **UI.** A "Back" control shows from question 2 onward (manual mode only).
  Clicking it reverts the server, re-renders the previous question with the
  textarea prefilled, and reverts the live score bars to their pre-turn values.

## Files
- `frontend/server/sessions.js` — init `turnSnapshots: []`.
- `frontend/server/handlers/plan.js` — push snapshot before mutating.
- `frontend/server/handlers/back.js` — new restore handler + amend log.
- `frontend/server/server.js` — route `POST /api/back`.
- `frontend/server/session-persistence.js` — persist/hydrate `turnSnapshots`.
- `frontend/client/src/api.js` — `goBack(sessionId)`.
- `frontend/client/src/stages/questioning.js` — Back button, prefill, axes revert.

## Not in this phase
- A history browser / jumping to an arbitrary earlier turn.

## Done when
- [ ] Amend flow works end-to-end; original answer preserved in `amend-log.json`.
- [ ] Free checks green (`npm test`, offline replay). Gate/smoke only on Carl's go-ahead.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Fix a typo** — answer with garbled text, land on the next question, click Back,
   fix it. The note and score change update, and the next question follows your
   corrected answer. ❌ Not OK if the next question still chases the garbled version.
2. **No phantom follow-up** — on a "go deeper" turn, go Back and change the answer
   so it shouldn't trigger a follow-up. The old follow-up is gone. ❌ Not OK if it lingers.
3. **First question** — on Q1 (nothing answered) there is no Back button.
4. **Walk back two** — answer Q1 and Q2; from Q3 Back → Q2 prefilled, Back again →
   Q1 prefilled, scores match the Q1 state. No errors.
5. **Skip then back** — skip a question, land on the next, Back → the skipped
   question returns with an empty box and you can now answer it.
6. **Agenda revert** — if answering the agenda-check injected a carry-forward
   question (count +1), Back removes it again; the question count is back to before.
7. **Log keeps the truth** — `amend-log.json` in the run folder shows the discarded
   original answer.
