# Phase 3 — The example, labelled

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

The example 1:1 that every new signup is seeded with says it is an example, so a manager's first impression is not a fake past 1:1 presented as real.

## Blocked until a lane clears

This phase needs `backend/engine/run-history.ts` and `backend/db/runs-store.ts`, both currently claimed in [LANES.md](../../../../LANES.md) by another chat's refactor programme. Check the board before starting. Nothing in Phases 1 or 2 touches them.

## Changes

**Backend — the two repo implementations, which must move together**
- `backend/db/runs-store.ts:412-423` (`pgListRecentRuns`) and `backend/engine/run-history.ts:222-246` (`listRecentRuns`) — add `isDemo: state.isDemo === true` to the recent row. `state.isDemo` is already authoritative (`session-persistence.ts:63`, written by `demo-seed.service.ts:134`), so this is a one-line add per file with no new query and no migration. If only one moves, the parity test `backend/tests/runs/test-pg-runs-parity.js:107` fails, which is the point of that test.
- `backend/api/services/runs/runs.service.ts` — add `isDemo` to the (already widened) mapper.

**Frontend**
- `admin/src/stages/start-rows.ts` — `rowModel` returns `isExample` from `isDemo`.
- `admin/src/stages/start-core.js` — render an "Example" chip in the `.run-list__side` slot. **Not** gated on internal admin: the whole point is that the customer sees it.
- `admin/src/stages/start-core.js` — `realRuns` gains its `.filter(r => !r.isDemo)`, the one-line change Phase 2 set up, so the first-run guidance card stays visible alongside the example row.
- `admin/src/styles/design/start-stage.css` — one chip class using `--color-accent-soft` / `--color-ink-dim` at `--type-label` (14px, `tokens.css:338`).

**Tracker**
- Strike the Home bullet from `docs/plans/doing/demo-member/phase-2.md` with a pointer here. The badge on Team / person detail / recap and the "Remove example" action stay in that plan, because removal must delete the person and the run together and needs a backend endpoint that does not exist yet.

## Not in this phase

- "Remove example" anywhere. Deleting only the demo *run* from Home would leave the demo *person* on Team, which is a worse half-removed state.
- Labelling the example on "See all past 1:1s". `pgListFinishedRunsForMember` does not filter demo rows and `toMemberRow` does not carry `isDemo`, so that screen currently *cannot* label it. Logged in plan.md's Parked list and should be added to demo-member Phase 2.

## Tests, written first

- `admin/src/stages/start-rows.test.ts` — `isDemo: true` → `isExample: true`; absent → false.
- `admin/src/stages/start-core.test.ts` — the chip is rendered, and it is **not** inside an `isInternalAdmin` gate.
- `backend/tests/runs/test-pg-runs-parity.js` — passes unchanged, proving both repos moved together.

## Done when

- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` all clean.
- [ ] A screenshot of a brand-new account's Home shows the chip.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner

Walk through these yourself.
Where to click: `local > frontend app > register a brand-new account > Home`

1. **The example admits it** — the seeded 1:1 row carries an "Example" chip, and the "First time?" card still shows above it. ❌ Not OK if the row looks like a real past 1:1.
2. **Real 1:1s are not chipped** — do a real prep. Its row has no "Example" chip; the seeded one keeps its chip.
3. **Internal view matches** — log in as an internal admin. The Example chip is still there. ❌ Not OK if it only appears for one kind of account.
