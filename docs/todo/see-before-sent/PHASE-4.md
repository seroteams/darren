# Phase 4 — Synthesis (EVAL) preview

## Scope
Add `assembleEval()` in `src/reviewer.js` (reuse its `buildMessages`); register `EVAL`. Reuse the evaluation handler's input merge — intake notes + captured notes (`frontend/server/handlers/evaluation.js`). Requires transcript + final axisState + prior results.

## QA scenarios
1. After a run with a transcript, reach **Synthesis** → Sent tab shows the conversation transcript, running scores (axis state), and notes — labelled, with raw toggle.
2. Notes shown = intake notes + in-session captured notes merged (matches what the live run uses).

## Sign-off
- [ ] Product owner green light → commit (local).
