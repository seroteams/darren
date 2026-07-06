# Phase 4 — manager UI: person picker + roster-driven Team page

## BUILT — awaiting Carl's walk (2026-07-06)

- **Intake NAME step is now a person picker** for managers with a roster: one tap fills
  name/role/seniority AND links the run to that roster row; "Someone new" (and every
  guest/member/roster-less flow) falls back to the plain free-text input unchanged.
  Free-typing a name clears any stale pick (server auto-matches from the name anyway).
- **Team + person pages group by personId** (roster identity) when runs carry one —
  name-key + aliases stay as the fallback for unstamped legacy runs. The roster row's
  name/role now win over the runs' free-text snapshots.
- **Tidy-up writes the people table** for roster cards (PATCH rename / merge with the
  new id-merges fold); legacy name-keyed cards keep the alias endpoints; the merge
  picker only offers same-kind targets. Alias routes stay live but the roster path is
  primary now.
- "Prep next 1:1" on a person page seeds personId + stored seniority.
- run-history member rows now carry `personId`; people list returns `{ people, merges }`.
- Test-first: 3 new grouping cases + 1 people-service merges-map case (red→green).
- **Live-proven headless-browser walk on a scratch pair (:3073 → :3071, $0):** logged in
  as manager@ → typed-lowercase "priya shah" prep showed on Team under the ROSTER name
  "Priya Shah" with the honest "prep in progress" label → Tidy-up rename to "Priya S."
  landed in the Neon people table (verified by query) → picker showed both people incl.
  the new name → picking Marco prefilled his role and jumped to step 2 → "Someone new"
  gave the plain input and advanced. No page errors. QA rows/dirs/mirrors cleaned.
- Checks: `npm test` **79/79** · typecheck clean. Screenshot sent to Carl.

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
