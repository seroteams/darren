# Phase 3 — The example, labelled

**Part of:** [plan.md](plan.md) · **Status:** ✅ done

## ✅ GREEN-LIT 2026-07-25 — Carl walked the labelled example and signed it off

## Built (2026-07-25)

The lane block cleared before this phase started: the refactor programme released `run-history.ts` and `runs-store.ts` on 2026-07-25.

**Files**
- `backend/engine/run-history.ts` and `backend/db/runs-store.ts` — one line each: `isDemo: state.isDemo === true` on the recent-run row. `isDemo` is already written into session state by `demo-seed.service.ts:134`, so no query and no migration. Both moved together; `backend/tests/runs/test-pg-runs-parity.js` is what would have caught a one-sided change.
- `backend/api/services/runs/runs.service.ts` — `isDemo` added to the mapper, coerced to a real boolean so a stringy value can't pass as an example.
- `admin/src/stages/start-rows.ts` — `rowModel` returns `isExample`. Absent means real: never guessed the other way.
- `admin/src/stages/start-core.js` — `exampleChip()` renders in the row's side slot, **not** gated on internal admin. `realRuns` now filters the example out, so a brand-new account keeps the invitation card WITH the example row below it.
- `admin/src/styles/design/start-stage.css` — `.run-list__example`, deliberately neutral rather than accent: it labels the row, it doesn't sell it.
- Tests: 1 new in `start-rows.test.ts`, 1 new in `runs.service.test.ts`, 1 new + 1 tightened in `start-core.test.ts`.

**Offline proof** — `npm test` 186/186 (parity test included) · `npm run typecheck` clean · `lint:tokens` PASS · `lint:copy` PASS. No paid runs.

**Live proof** on `localhost:3173` against real Postgres rows:
- `/api/v1/runs/recent` returns `isDemo: true` for the seeded Sofia run and `false` for two real ones.
- Populated Home renders `Marcus [Half done]`, `Priya [Half done]`, `Sofia [Example]`. Exactly one Example chip, 14px, `rgb(99,99,99)` on `--color-surface-2`.
- Example-only account (State B): `{invitationShown: true, buttonInsideCard: true, buttonLabel: "Start your first 1:1", solidBlue: 1, cardInsideList: false, rows: ["Sofia ... Example"]}`. The invitation and the labelled example sit together, exactly as the approved mockup.

**Not verified** — no pixel screenshot; the Browser pane is not displayed in this session, so the evidence above is read from the live rendered DOM and computed styles.

## Goal

The example 1:1 that every new signup is seeded with says it is an example, so a manager's first impression is not a fake past 1:1 presented as real.


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
