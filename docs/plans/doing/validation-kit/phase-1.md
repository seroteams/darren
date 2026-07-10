# Phase 1 — To-do page as live checklist

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-10
Carl walked the scenarios on localhost (API restart verified — fresh process on :3001) and said done. Closed same day via phase-close.

## Goal
The /tasks page shows this track as a live per-phase checklist that ticks off as phases are green-lit, and nothing done or stale sits on the board.

## Changes
- Backend heartbeat (**required** — verified 2026-07-10): `countPhases()` in `backend/api/services/heartbeat/heartbeat.service.ts:93-109` only tallies counts; extend it (and the `TodoPlan` shape, `:14-27`) to emit ordered per-phase `{ label, status }` rows parsed from plan.md's phase table.
- `admin/src/stages/tasks.js` — upgrade the auto-filled Docs card for an active plan so it shows those phases as a checklist (⬜/🔨/✅), not just the "X/Y phases done" note (`docNote`, `tasks.js:347-352`).
- Done-plan sweep: the move-to-Done logic already exists (`tasks.js:405-427`) — verify it covers the board's current cards and tidy anything it misses; a plan that finished before ever having a card gets none (correct).

## Not in this phase
- No changes to Carl's own hand-added kanban cards (his browser storage stays untouched — he can delete his own stale ones with the existing X).
- No new tracking or feedback features — those are Phases 2–3.

## Done when
- [ ] Opening /tasks shows "Validation Kit" with 5 phase lines, statuses matching plan.md on disk (verify by editing plan.md status and refreshing — the DESTINATION check).
- [ ] No done/completed plan appears as an active card.
- [ ] Product owner has tested the scenarios below and said go.

## Built — 2026-07-10

- **Backend** — `heartbeat.service.ts`: new `listPhases()` parses the plan.md phase table into ordered `{label, status}` rows (same one-glyph row rule as the old counter; `countPhases()` now derives from it). `TodoPlan` gained `phases: PlanPhase[]`, emitted per active plan in the heartbeat. Test-first: 4 new tests written red, then green (17/17 in the file).
- **Frontend** — `tasks.js`: Docs cards render the phase checklist (⬜/🔨/✅ glyphs, done struck through, in-progress bold, 14px floor). Reconcile carries `phases` on Docs cards, detects phase-status changes as updates, and clears the checklist when a card sweeps to Done. The note drops the redundant "X/Y phases done" count when the checklist shows.
- **Done-plan sweep** — verified the existing logic paths: done slug → card parks in Done; vanished slug → card removed; a plan finished before ever having a card gets none (confirmed on a fresh board: only the 2 active plans got cards, nothing from `done/`).
- **Verified live** (fresh API + web on 3081/3083, dev side-door): /tasks shows Validation Kit with all 5 phases from disk; flipping Phase 1 to 🔨 in plan.md + refresh updated the checklist AND moved the card To do → Doing, no rebuild. Console clean.
- **Checks** — `npm test` 109/109, `npm run typecheck` clean (baseline and after). No paid runs (none needed — no engine/prompt surface).
- **Note for the walk** — the API re-reads docs per request, but it must be running THIS build: restart `npm run dev` once before scenario 1, or the cards fall back to the old count-only note.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **See the track** — open the /tasks page. You should see a "Validation Kit" card listing all 5 phases, each with a clear not-started marker. ❌ Not OK if it's still a one-line card or the phases don't match the plan.
2. **Live, not hand-typed** — ask me to flip Phase 1 to 🔨 in plan.md, then refresh the page. The checklist should update by itself. ❌ Not OK if it needs a rebuild or shows stale status.
3. **Clean board** — scan the whole board. Nothing that's finished should look like current work. ❌ Not OK if old done tracks still sit in active columns.
