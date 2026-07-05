# Phase 1 — Sending, live from your draft answer

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
On a question, as you type your answer, the **Sending** view fills in live with the exact
planner prompt that would go to the AI — no more "Waiting…" blank.

## Changes
**Backend (extend Phase 4's foundation):**
- `backend/api/services/sessions/plan-turn-inputs.ts` — `buildPlanTurnInputs(session, draftAnswer?)`: when a draft is passed, use it as a synthetic pending answer (`{ text: draft, skipped: false }`) instead of `session.pendingAnswer`, so a preview works *while typing*, before submit. Falls back to the real pending answer when no draft.
- `backend/api/services/sessions/sessions.service.ts` — `preview(id, stage, draft?)` threads the draft into the `QUESTIONING` assembler; when there's a draft, no 409 for "no pending answer".
- `backend/api/services/sessions/sessions.controller.ts` — read `c.query.draft` and pass it through.

**Frontend:**
- `shared/api.js` — `getStagePreview(sessionId, stage, draft?)` appends `&draft=<encoded>`.
- `admin/src/stages/questioning.js` — on answer-box input, write the draft to the store (debounced ~300ms): `setState({ draftAnswer: value })`; clear it on submit/stage change.
- `admin/src/ui/stage-data-tab.js` — `render()` reads `draftAnswer`; include it in the cache key; pass it to `getStagePreview` for the questioning stage.
- Rename the "Sent" tab label to **"Sending"** (present/future tense fits the live preview).

## Not in this phase
- "Received" and "Rules" (Phases 2-3).
- Live preview for non-questioning stages (they're single-shot; not needed).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Type → it fills in** — start a 1:1, reach a question, open **Run panel → Sending**. As you type your answer, the prompt updates to show the exact text that would go to the AI, *with your words in it*. ❌ Not OK if it stays on "Waiting…".
2. **Empty box is honest** — with the answer box empty, Sending shows either the current planner setup or a plain "nothing to send yet" — never a made-up answer.
3. **No cost, no lag** — typing doesn't spend anything (cost log flat) and doesn't feel janky (updates settle a moment after you stop typing, not on every single keystroke).
4. **Matches the real send** — submit the answer; what actually gets sent matches the last live preview you saw.
