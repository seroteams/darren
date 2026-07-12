# Phase 1 — Backend: expose the answers on the member route

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-12 — Carl walked the tests + JSON proof ("a"), committed
Member route now returns `turns[]`; internal planner note confirmed stripped; empty run → `[]`.

## Built (2026-07-12)
- `backend/db/runs-store.ts` — `toMemberView` now projects `turns[]` from `state.transcript`.
- `backend/engine/run-history.ts` — `memberRunView` now projects `turns[]` from `transcript.json` (parity with PG).
- `backend/db/runs-store.test.ts` — 2 new unit tests (projection + empty case + note-dropped).
- Proof (offline, free): `npm test` **124/124** (incl. `test-pg-runs-parity` "memberRun view matches"), `npm run typecheck` clean. Real projection output shows question/answer/skipped with the internal `note` stripped; empty run → `turns: []`.
- Not committed yet — waiting on Carl's green light (per Darren Method).

## Goal
Make the raw questions-and-answers (`turns[]`) available on `GET /api/v1/runs/mine/:id` so the frontend Answers tab (Phase 2) has data to show — without leaking internal planner notes.

## Changes
- `backend/db/runs-store.ts` — `toMemberView` gains `turns: { alias, name, answer, skipped }[]`, projected from `state.transcript` (mirrors `pgCompareRun`, minus the internal `note`).
- `backend/engine/run-history.ts` — `memberRunView` gains the same `turns[]`, projected the same way `compareRun` reads the transcript (`transcript.json`), so file ↔ PG stay in parity.
- `backend/db/runs-store.test.ts` — new unit test on `toMemberView` (free, no DB): turns projected, skipped preserved, internal `note` dropped, empty transcript → `[]`.

## Not in this phase
- The frontend `RunDetail` type and the Answers tab UI — that's Phase 2. The backend returning an extra field the frontend doesn't yet read is harmless.
- Any change to the superadmin or compare views (already have their own `turns`).

## Done when
- [ ] `toMemberView` and `memberRunView` both return `turns[]` shaped `{ alias, name, answer, skipped }`, with no `note` field.
- [ ] A run with transcript entries → `turns` populated; a run with none → `turns: []`.
- [ ] New unit test passes; `npm test` green; `npm run typecheck` clean.
- [ ] (On Carl's machine, DB present) the parity test `memberRun view matches` still passes — file and PG views identical.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
This phase is backend plumbing — nothing visible in the app yet (that's Phase 2). The proof is the tests. Walk these:
1. **Tests green** — I run `npm test`. You should see the new `toMemberView … turns` test pass and the whole suite stay green. ❌ Not OK if anything went red.
2. **Types clean** — I run `npm run typecheck`. You should see no errors. ❌ Not OK if it complains about `turns`.
3. **Answers are really there** — I show you the JSON the member endpoint now returns for a run that had a conversation: a `turns` array with each question and its answer, and skipped ones flagged. And for the empty `qa-overnight Priya` run: `turns: []`. ❌ Not OK if the internal `note` text shows up in that JSON.
