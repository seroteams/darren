# Phase 1 — Saturation + the "Complete / Continue deeper" choice

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
On the live web 1:1, once the answers have covered the whole picture (turn 4+), present the manager a wrap-up moment with two buttons — **Complete 1:1** (primary) and **Continue deeper** (secondary) — instead of silently running the full arc. Complete wraps to the briefing; Continue deeper keeps the conversation going. Thin / still-opening conversations never see the offer.

## Changes
- **Detect saturation** — a small co-located helper (e.g. `backend/engine/saturation.ts` + mirrored test): pure `isSaturated({ turn, axisState, transcript, arc, lastAnswerShallow })` → boolean. Balanced rule v1, true only when **all** hold:
  1. `turn >= 4` (floor — never offer before Q4),
  2. every axis has ≥1 **substantive** (non-shallow) touch (signal across the whole picture),
  3. the just-answered turn was **not** shallow,
  4. a closer is reserved and not yet asked.
- **Surface the offer (backend)** — `backend/api/services/sessions/session-streams.ts` (`planStream`) + the `question`/snapshot shape: when saturated, mark the served turn with an `offerComplete` flag the client can read. No auto-end.
- **The choice (backend)** — **Complete 1:1** ends the run by setting `session.totalBudget = turn + 1` (existing closer force-insert + done-gate do the rest). **Continue deeper** clears the offer and continues the normal flow (Phase 2 makes it dig into raised issues).
- **The two buttons (frontend, both apps)** — **placement (Carl's pick): under the warm closing question.** At saturation the engine serves its closer/wrap-up question ("what would make the next stretch lighter / how can I help"), and the two buttons sit beneath it: primary **Complete 1:1**, secondary **Continue deeper** (`admin/src/stages/questioning.js` + the frontend equivalent), styled per DESIGN.md (one blue primary action). The manager answers the wrap-up, then Complete → briefing; Continue deeper → the closer steps aside and the conversation carries on. Wire each to the backend choice.

## Not in this phase
- Making **Continue deeper** ask *deeper questions about the issues raised* — that's Phase 2. Here it just resumes the normal conversation.
- Tuning the eagerness / the exact signal (later, from Carl's real-run QA).
- CLI parity (parked).

## Done when
- [ ] `isSaturated` unit test: true for a covered turn-5 state; false at turn 3 (floor); false when an axis is untouched; false on a shallow last answer.
- [ ] Driven on the real running app: a rich bi-weekly reaches the offer around Q4–5; **Complete 1:1** produces a complete briefing; **Continue deeper** keeps it going. Verified against the session snapshot (the `offerComplete` flag; `totalBudget` drops to `turn+1` only on Complete).
- [ ] The two-button moment **screenshotted** on the running app (design-work-not-done-until-seen rule).
- [ ] `npm test` green + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these on the dev app (I'll have it running + point you to the screen). Next phase waits for your green light.

1. **The choice appears on a rich run** — start a **bi-weekly**, give full, specific answers covering how you're doing, what's snagging, what's moving (≈4 strong answers). You should see, around Q4–5, a primary **Complete 1:1** and a secondary **Continue deeper**. ❌ Not OK if it appears before Q4, or never appears on a clearly-covered conversation.
2. **Complete 1:1 wraps cleanly** — at that moment, click **Complete 1:1**. You should land on a briefing that still feels complete (nothing missing). ❌ Not OK if the briefing is thin or errors.
3. **Continue deeper keeps going** — on a fresh rich run, click **Continue deeper** instead. The 1:1 should carry on with more questions and end normally later. ❌ Not OK if it ends anyway, or jams.
4. **Thin conversation never gets the offer** — start a **bi-weekly**, answer weakly ("fine", "ok", "dunno"). You should **not** see the two buttons — it behaves like today. ❌ Not OK if weak answers trigger the offer.
5. **Growth stays deep** — start a **growth** 1:1, answer normally. It should run its longer arc; the offer only appears if the ground's genuinely covered, never truncating a real career chat on a couple of good answers. ❌ Not OK if it offers to wrap up prematurely.
6. **Button styling** — the two buttons read as a clear primary (**Complete 1:1**) and secondary (**Continue deeper**), matching the app's design (one blue action). ❌ Not OK if they look like two equal/competing buttons.
