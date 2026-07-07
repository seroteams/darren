# Phase 1 — Focus points

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
The Run panel's "Sent" tab shows the exact about-to-send text for the **focus points** step before it runs.

## Changes
- `backend/engine/generate.ts` — add `assembleFocusPoints(inputs, {model})` returning `{ model, prompt }`. It reuses the same `buildMessages(...)` the live send uses (`catalogueForArc(loadFocusPoints(), meetingType)` → `buildMessages({...inputs, focusPoints: offered}).filled`). No AI call.
- `backend/api/services/sessions/sessions.service.ts` — register `FOCUS_POINTS: (s) => ({ label: "Focus points", ...assembleFocusPoints(s.ctx) })` in `PREVIEW_ASSEMBLERS`; add the import; drop the "Preparation only for now" comment.
- Tests: engine test asserting `prompt === buildMessages(sameInputs).filled` and 0 AI calls; update the existing `sessions.service.test.ts` preview test (a fresh session is now *supported*).

## Not in this phase
- Question bank, evaluation, questioning previews (later phases).
- Any UI change.

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **See the focus-points text** — start a 1:1, open **Run panel → Sent** while on the focus-points step (or click into it). You should see the exact prompt under *"Not sent yet…"* / *"exact text sent to the model"*. ❌ Not OK if it says "This step doesn't send anything to the AI."
2. **It matches what actually ran** — after the step runs, the logged "Sent" text should be the same words as the preview showed (nothing rewritten). ❌ Not OK if they differ.
3. **No cost** — nothing new appears in the cost log from opening the preview. (Focus points is pre-warmed at start, so it may already be sent by the time the panel loads — that's expected; the preview is still correct.)
