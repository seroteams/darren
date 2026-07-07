# Phase 3 — Final briefing (evaluation)

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
The Run panel's "Sent" tab shows the exact about-to-send text for the **final briefing / evaluation** step before it runs.

## Changes
- `backend/engine/reviewer.ts` — add `assembleEvaluation(args, {model})` returning `{ model, prompt }`, mirroring the stage's `selectedFocus` prelude then `buildMessages(...).filled`. No AI call.
- `backend/api/services/sessions/evaluation-inputs.ts` (new) — `buildEvaluationInputs(session)` replicating the live eval stream's mapping exactly: notes pipeline (`formatNotesForEvaluation` + `stripTesterNoteLines`), transcript projection, axis-state serialize, agenda. Throws **409** when `!session.focusPointsResult`.
- `sessions.service.ts` — register `EVAL: (s) => ({ label: "Final briefing", ...assembleEvaluation(buildEvaluationInputs(s)) })`.
- Tests: engine no-drift + 0-AI-calls test; service happy-path + 409 not-ready test.

## Not in this phase
- Questioning (per-turn planner) preview — Phase 4.
- Any UI change.

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **See the briefing text** — run a 1:1 to the end (reach the final-briefing step), open **Run panel → Sent** before it runs. You should see the full prompt including the conversation so far. ❌ Not OK if empty or missing the transcript.
2. **It matches what ran** — after the briefing generates, the logged "Sent" text matches the preview words (notes, transcript, scores all the same).
3. **Your private notes show through** — if you added test notes during the run, they appear in the eval prompt exactly as they'll be sent.
