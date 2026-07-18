# Phase 1 — The wrap-up door

## ✅ GREEN-LIT 2026-07-18
Carl walked the door on the real app ("yeah works, nice") — button relabels from Q4, warm confirm,
exits through a real closer into the briefing. Open finding below (the turn≥4 backend floor guard)
handed to Carl as a separate call; not part of this close.

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit 2026-07-18

## Built (2026-07-17)
- Backend: `wrapUp` service (sessions.service.ts) + `POST /api/v1/sessions/:id/wrap-up` (controller + server.ts) — shortens the budget to turn+1 and fronts the closer; scripted/finished/no-closer fall back safely.
- Client: `wrapUpSession` in shared/api.js; questioning.js relabels the escape from Q4 ("Wrap up — get my briefing"), warm confirm, routes through the closer (one shared file = both apps).
- Proof: 6 new unit tests (91/91 in the service file), npm test 147/147, typecheck clean. Manual UI walk verified Q1–3 keep "Skip to briefing", Q5 shows the wrap button, cancel preserves typed notes, wrap → "Question 5 of 5" with the real closer + "Agree next actions" fork, briefing complete. Pixel screenshot NOT captured — the Browser pane's capture is stuck (known env limitation); verified against the rendered DOM instead.
- Paid API test sweep (~$1.85 of a $2 budget, 4 real engine runs): all 4 wrapped correctly and ended after a real closer —
  | Type | wrapped after | budget before→after | closer served | ended |
  |---|---|---|---|---|
  | bi-weekly | Q4 | 6→5 | q_closer_20 (5/5) | done + briefing 5760ch |
  | growth | Q5 | 9→6 | q_next_move_47 (6/6) | done |
  | feels-off | Q4 | 6→5 | q_next_move_80 (5/5) | done |
  | edge wrap@2 | Q2 | 6→3 | q_shared_definition (3/3) | done |
- FINDING: the floor of 4 is enforced in the UI only (button hidden before Q4); the backend `wrapUp` has NO floor, so the edge wrap@2 produced a valid 3-question run. Harmless today (no UI path reaches it) but the API contract doesn't match the stated policy. Recommend a one-line `session.turn >= 4` guard in the service for defense-in-depth — flagged to Carl, not yet added.

## Goal
From Q4 onward the escape button becomes "Wrap up — get my briefing" and routes through the closing question instead of dumping straight to the briefing.

## Changes
- **Backend** — `sessions.service.ts`: new `wrapUp(id)` — if a closer is reserved and unasked (and the run isn't scripted/finished), set `totalBudget = turn + 1` and put the closer at the front of the queue; return `{ closerNext: true }`. Otherwise `{ closerNext: false }` (client falls back to today's skip). Controller + route `POST /api/v1/sessions/:id/wrap-up` (same shape as agenda/cover).
- **Frontend (one shared file, both apps)** — `admin/src/stages/questioning.js`: per-question, from `res.turn >= 4` and not already the final question and not scripted, relabel the header button and swap its handler: warm confirm → call wrap-up → `closerNext ? showNextQuestion() : EVAL`.
- Warm confirm copy (no loss framing): "You've covered good ground. One closing question, then your briefing — nothing you've shared is lost."

## Not in this phase
- Any detection/auto-offer (parked).
- Usage analytics (parked).

## Done when
- [ ] Service unit tests: wrap-up reroutes through the closer (budget = turn+1, closer at head); no-closer → `closerNext:false` untouched; already-final → `closerNext:false`; scripted → untouched; 404 unknown.
- [ ] `npm test` green + typecheck clean.
- [ ] Seen on the real screen (screenshot): the relabelled button at Q4, the closer arriving after clicking it, the briefing after.
- [ ] Product owner walked the scenarios and said go.

## Test scenarios — for the product owner
1. **The door changes at Q4** — start a bi-weekly, answer 3 questions. On question 4 the top-right button should now say **"Wrap up — get my briefing"** (it said "Skip to briefing" on Q1–3). ❌ Not OK if it appears before Q4.
2. **Wrapping feels complete** — click it, accept the confirm. You should get ONE warm closing question ("what would help…"), with the usual "Agree next actions" finish, then a briefing that reads complete. ❌ Not OK if it dumps straight to the briefing with no closer, or errors.
3. **Early escape still works** — on question 2, the button still says "Skip to briefing" and behaves like today (straight out, with the old warning). ❌ Not OK if the early exit got slower or pushier.
4. **Saying no is free** — click "Wrap up", then cancel on the confirm. The question you were on is still there, untouched. ❌ Not OK if cancelling loses your typed notes.
