# Phase 4 — manager UI: person picker + roster-driven Team page

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
