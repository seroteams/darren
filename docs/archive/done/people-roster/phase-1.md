# Phase 1 — `people` table + roster service (backend only)

App behavior unchanged after this phase — it's the foundation the rest builds on.

## BUILT — awaiting Carl's walk (2026-07-05)

- Schema + **migration 0007 applied to Neon** (verified by querying the live DB: 11 columns, 3 indexes, 4 FKs).
- `people.repo.ts` (pg) + `people.service.ts` — **test-first**, 11 unit cases red→green.
- 5 routes live (GET/POST /api/v1/team/people, PATCH /:id, POST /:id/merge, /:id/archive), manager/admin only, mutations origin-guarded.
- **Live-proven on a scratch API (:3041, $0):** create trims + dedupes ("qa test person" → same row), rename + clear-role, merge folds the card away, self-merge → 400, archive empties the list, member GET/POST → **403**, unknown id → **404**, logged-out → **401**. Merge/archive flags verified IN the Neon table (not just API replies); QA rows deleted after.
- Checks: `npm test` **75/75** · `npm run typecheck` clean.
- Committed path-scoped, labelled "built — awaiting walk".

## Baseline (before touching anything)

- `npm test` (2026-07-05): **71/74** — 4 failing subtests PRE-EXIST this track, in a parallel session's
  in-flight "open preps" work: `runs.service.test.ts` (includeOpen passthrough) + `group-people.test.ts`
  (3 open-prep counting cases). Not caused here; not fixed here.
- `npm run typecheck` (2026-07-05): **clean**.
- ⚠️ Parallel-session overlap: `group-people.js`/`.test.ts` and the runs service are mid-work by another
  track — Phase 4 touches them, re-baseline before starting it. Commits from this track go path-scoped
  (`git commit -- <paths>`), never a sweep.

## Work

1. **Schema** — add `people` to [backend/db/schema.ts](../../../../backend/db/schema.ts):
   - id (uuid PK), orgId (FK organizations, NOT NULL), managerId (FK users, NOT NULL), name (NOT NULL), role, seniority, userId (FK users, nullable — the member-account link), mergedIntoId (self-FK, nullable), archivedAt, createdAt, updatedAt.
   - Indexes: org_id, manager_id, user_id.
   - Generate migration 0007 via `npm run db:generate`.
2. **Repo** — `backend/api/services/team/people.repo.ts` (pg-backed, interface seam like TeamRepo).
3. **Service (test-first)** — `backend/api/services/team/people.service.ts` + `people.service.test.ts` (in-memory fake repo):
   - list (merges resolved via chain-follow, merged/archived excluded)
   - create (dedupe on normalized name against caller's active roster → return existing)
   - rename/edit · merge (reject self/cycle — same guard logic as teamService.merge) · archive
   - every op fenced to caller's orgId + managerId (miss → not found)
4. **Routes** — team.controller.ts handlers + [server.ts](../../../../backend/api/server.ts):
   - GET /api/v1/team/people · POST /api/v1/team/people · PATCH /api/v1/team/people/:id · POST /api/v1/team/people/:id/merge · POST /api/v1/team/people/:id/archive
   - Manager/admin only (requireAdmin); origin-guarded like sibling mutating routes.

## Done when

- Migration applies cleanly to local PG.
- Endpoints work against local PG.
- A manager cannot read/edit another manager's people (404) or another org's (404); member role gets 403.
- Existing app behavior unchanged; `npm test` + `npm run typecheck` green.

## QA scenarios (Carl walks these)

1. As carl@seroteams.com: create a person ("Test Person, Engineer, Senior") → appears in GET /team/people.
2. Rename them; merge two test people; archive one — each survives an API restart (DB-backed, not memory).
3. Create "priya" then "Priya " → one row, not two (dedupe).
4. Logged in as member@seroteams.com: POST /team/people → 403; GET → 403.
5. (Fencing probe) A person created by one manager is invisible to another manager account.
