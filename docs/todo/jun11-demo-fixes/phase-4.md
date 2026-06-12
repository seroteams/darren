# Phase 4 — Back-to-question navigation

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Starts only after Phases 1–3 are approved and committed.**

## Goal
The manager can step back one question, fix the answer (typos, missed half a sentence), and the session carries on from the corrected answer.

## Spec — answer these before any code
Proposed answers; confirm with Carl at phase start:
1. **Only the immediately previous answer is editable?** Proposed: yes — one step back, no history browser.
2. **What happens to a question already generated from the old answer?** Proposed: discarded and regenerated from the amended answer.
3. **Revision or overwrite?** Proposed: revision — the turn keeps both, ships the amended one.
4. **Does the run log keep the original answer?** Proposed: yes, for debugging.
5. **What if the discarded question was a thread-follow?** Proposed: the planner simply re-plans from the amended answer; if no grounded thread-follow exists, none is injected (same skip rule as Phase 1).

## Changes
- `frontend/client/src/stages/questioning.js` — "back" affordance on the previous turn.
- `frontend/server/handlers/answer.js` + session state — accept an amended answer for the previous turn; re-score it, recompute axis state, regenerate the next question.

## Not in this phase
- Multi-step undo or a history browser.
- Editing answers from earlier than the previous turn.

## Done when
- [ ] All five spec questions answered and agreed.
- [ ] Amend flow works end-to-end; original answer preserved in the run log.
- [ ] `npm run gate` + smoke green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Fix a typo** — answer a question with garbled text, go back, fix it. The note and score change should update, and the *next* question should follow from your corrected answer. ❌ Not OK if the next question still chases the garbled version.
2. **One step only** — after answering the next question, you should no longer be able to edit the older one. ❌ Not OK if you can rewrite history further back.
3. **Log keeps the truth** — in the run folder, the turn should show both the original and the amended answer.
