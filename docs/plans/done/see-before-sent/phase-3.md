# Phase 3 — Questions (BANK) preview

## Scope
Add `assembleBank()` in `src/question-generator.js` (reuse its `buildMessages`); register `BANK` in `ASSEMBLERS`. Reuse the bank handler's input assembly (`frontend/server/handlers/bank.js`). Requires `focusPointsResult`, `preparationResult.brief`, `selectedFocus`, `introQueue`, axes — throw 409 if a required input is missing.

## QA scenarios
1. Reach **Questions** → Sent tab shows the payload: scoring dimensions (axes), focus points, prep brief, intro queue — labelled, with raw toggle.
2. If a required prior result is missing, it shows a clear "not ready yet" state, not a broken/empty payload.

## Sign-off
- [ ] Product owner green light → commit (local).
