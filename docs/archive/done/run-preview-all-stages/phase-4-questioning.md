# Phase 4 — Questioning (per-turn planner)

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
The Run panel's "Sent" tab shows the exact about-to-send text for the **next-question planner** — the step that picks the next question after each answer.

## The honesty catch (why this one's last)
The planner fires once per submitted answer, and its prompt depends on the answer just
given. There's no single "planner prompt" sitting around to preview. The only moment we can
honestly show the exact text is when an answer has been submitted and is waiting to be
planned (`session.pendingAnswer`). Before that, showing a guess would be dishonest — the
real send uses the actual answer. So:
- Preview only when an answer is pending → show the exact next-turn prompt.
- Otherwise → 409 (the tab quietly shows "waiting", not an error).

## Changes
- `backend/engine/queue-manager.ts` — add `assemblePlanTurn(args, {model})` using the existing `messages.buildMessages` (`backend/engine/messages.ts`). No AI call.
- `backend/api/services/sessions/plan-turn-inputs.ts` (new) — `buildPlanTurnInputs(session)` builds the next-turn args from the pending answer **without mutating session state**. Throws **409** when no `pendingAnswer` or `!focusPointsResult`.
- Handle the planner **skip-shortcut** (`queue-manager.ts` ~line 263) honestly — that path sends nothing to the model, so represent it as "no model call", not a prompt.
- `sessions.service.ts` — register `QUESTIONING: (s) => ({ label: "Next question", ...assemblePlanTurn(buildPlanTurnInputs(s)) })`.
- Tests: pending-answer happy path; no-pending-answer 409; skip-shortcut case if implemented.

## Not in this phase
- Any UI change.

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **After you answer** — during questioning, type an answer and submit it, then open **Run panel → Sent**. You should see the exact planner prompt (with your answer in it) that decides the next question. ❌ Not OK if it shows an answer you didn't give.
2. **Before you answer** — sitting on a question you haven't answered yet, the tab quietly shows "waiting", never an error or a made-up prompt.
3. **It matches what ran** — the planner text you previewed matches what was actually sent for that turn.
