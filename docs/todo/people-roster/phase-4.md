# Phase 4 — manager UI: person picker + roster-driven Team page

## Split (2026-07-06): Carl chose **roster-driven** Team (add names before any 1:1). Two walkable chunks:
- **4a — roster-driven Team + data plumbing** → BUILT (below), awaiting walk.
- **4b — intake person picker** (NAME substage picker + start payload carries personId) → next.

## 4a BUILT — awaiting Carl's walk (2026-07-06)

- **Team page is now the real roster** ([team.ts](../../../admin/src/stages/team.ts) rewritten): lists `people` rows (so a name added with no 1:1 shows), joins run stats by `personId`. New **"Add someone"** button (bare `createPerson`); a met person's card opens their page; a **not-yet-met** person offers **"Prep first 1:1"**; **Tidy up** rename/merge now call the roster endpoints (`renamePersonV2`/`mergePeopleV2`), not the alias files.
- **Pure join is tested** — `buildRosterView(people, runs)` in [group-people.js](../../../admin/src/ui/group-people.js): one row per roster person, stats joined by personId, roster name wins over run name, met sorts above never-met, stragglers (a run whose personId isn't in the roster) still show. **5 new unit tests** (9 total in the file), test-first.
- **Person page re-keyed to personId** ([person-detail.ts](../../../admin/src/stages/person-detail.ts)): resolves the person + filters their runs on `personId` (was name-key), so the card and the page always agree.
- **Data pipe:** [run-history.ts](../../../backend/engine/run-history.ts) `listFinishedRunsForMember` row now carries `personId`; [shared/api.js](../../../shared/api.js) gains `listPeople`/`createPerson`/`renamePersonV2`/`mergePeopleV2`/`archivePerson`; `SessionCtx.personId` typed.
- **Offline proof (free, $0):** `npm test` **78/79** (the 1 fail is the pre-existing replay-regression drift, not this), root + admin typecheck clean, **admin `vite build` ✓**.
- ⚠️ **Not browser-walked here** (cloud clone, no live app/DB) — the click-through is Carl's walk. QA scenarios 1–4 below (picker scenarios wait for 4b; for 4a: Add someone → appears not-yet-met, Prep first 1:1, met person opens page, rename/merge persist + survive reload).

## Work

1. [shared/api.js](../../../shared/api.js): listPeople / createPerson / renamePersonV2 / mergePeopleV2 / archivePerson.
2. [intake.js](../../../admin/src/stages/intake.js): NAME substage → roster picker (caller's roster + "Someone new" free-text row); sets `store.ctx.personId`, seeds name/role/seniority from the row; free-text keeps working. Start payload passes personId.
3. [person-detail.ts](../../../admin/src/stages/person-detail.ts): "Prep next 1:1" seeds store.ctx.personId.
4. [team.ts](../../../admin/src/stages/team.ts) + person-detail.ts + [group-people.js](../../../admin/src/ui/group-people.js): group by `run.personId` when present (name-key fallback for unstamped stragglers); Tidy-up rename/merge call the people endpoints.
5. [run-history.ts](../../../backend/engine/run-history.ts): listFinishedRunsForMember row shape gains `personId`.
6. Alias routes stay but go unused by the UI (delete in a later cleanup slug).

## Done when

- A manager preps from the picker or free-text; Team + person pages group identically to before (backfilled data); a rename/merge in Tidy up persists in the DB.

## QA scenarios

1. Pick Grace from the picker → run start prefills role/seniority.
2. Free-type a brand-new name → person appears on Team after the run.
3. Rename + merge on Team page survive reload and a second browser.
4. Member role never sees the picker (members have no intake).
