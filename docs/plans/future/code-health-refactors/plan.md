# Code health — split the four oversized files

**Goal:** no source file over ~800 lines; the four current offenders become navigable, testable modules.
**Driver:** clean-up sweep 2026-07-15 (Lens F)
**Created:** 2026-07-15
**State:** PARKED — a proposal, not scheduled. Pure refactor; no behaviour change, no paid runs.
Sibling of the **shared-folder-split** code-health track (which owns the admin↔frontend shell
duplication — see `docs/plans/future/shared-shell-layer/plan.md`, folded in as its evidence annex).

## The four files (sweep evidence, 2026-07-15)

| File | Lines | Natural split |
|---|---|---|
| `backend/engine/reviewer.ts` | 916 | evaluation logic vs `computeReadQuality` vs HTML concerns |
| `admin/src/stages/universe.ts` | 824 | single stage screen; view vs data already half-split (`universe.model.ts` is another 688) |
| `backend/db/runs-store.ts` | 821 | data-access layer mixing many query concerns |
| `backend/engine/run-history.ts` | 801 | at the threshold; splittable by concern |

Watch-list (approaching, no action yet): `design.js` 754 · `role-profile.ts` 748 ·
`sessions.service.ts` 743 · `onepage.js` 732 · `golden-checks.ts` 724 (many independent check
functions — easiest split of the lot) · `briefing.js` 707.

## Rules when this wakes
- One file per phase, Darren Method — split, mirror the tests, `npm test` + `npm run typecheck`
  green, Carl green-lights, next.
- No behaviour changes ride along. If a bug is found mid-split, it gets its own commit first.
- Free checks only — nothing here needs the OpenAI API.
