# Phase 2 — Question bank

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
The Run panel's "Sent" tab shows the exact about-to-send text for the **question bank** step before it runs.

## Changes
- `backend/engine/question-generator.ts` — add `assembleBank(args, {model})` returning `{ model, prompt }`, mirroring the stage's `axes`/`selectedFocus` prelude then `buildMessages(...).filled`. No AI call.
- `backend/api/services/sessions/bank-inputs.ts` (new, cloned from `preparation-inputs.ts`) — `buildBankInputs(session)`: focus points + `session.ctx` + selected focus + intro queue + `prep` (degrades to null). Throws **409** when `!session.focusPointsResult`.
- `sessions.service.ts` — register `BANK: (s) => ({ label: "Question bank", ...assembleBank(buildBankInputs(s)) })`.
- Tests: engine no-drift + 0-AI-calls test; service happy-path + 409 not-ready test.

## Not in this phase
- Evaluation, questioning previews.
- Any UI change.

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **See the question-bank text** — start a 1:1, pick focus points, reach the question-bank step, open **Run panel → Sent**. You should see the exact prompt. ❌ Not OK if empty or "doesn't send anything."
2. **Before focus points are picked** — very early in a run, the bank preview should quietly show nothing (it's not ready yet), never an error or a crash.
3. **It matches what ran** — after the step runs, the logged "Sent" text matches the preview words.
