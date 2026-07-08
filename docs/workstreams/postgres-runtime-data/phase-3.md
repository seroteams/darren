# Phase 3 — Read cutover: the app trusts the DB, not the files

**Status:** ⬜ not started (blocked by Phase 2 green light)

## Why this phase

Only after Phase 2 has proven writes are complete and correct. This is the **security-sensitive**
phase — the org/member privacy walls currently enforced by `run-history.ts` get rewritten as SQL,
so it gets the parity test and the strictest QA.

## What gets built

1. **Async seam:** `RunsRepo` (`backend/api/services/runs/runs.repo.ts`), `runs.service.ts`
   methods and `SessionsRepo.get` become Promise-returning (controllers are already async —
   mechanical change). The in-memory session Map stays the sync hot store.
2. **New `backend/db/runs-store.ts`** — SQL implementations reproducing EVERY `run-history.ts`
   read, including fencing rules transcribed 1:1:
   - org fence is opt-in (null = unfenced, used by CLI/dev paths);
   - member/user fence is NEVER unfenced (`listFinishedRunsForMember`, `memberRunView`);
   - superadmin variants intentionally unfenced.
   - `listRecentRuns`, `listFinishedRuns`, `listFinishedRunsForMember`, `listFinishedRunsAboutPerson`,
     `listRunsForSuperadmin`, `listFinishedRunsForUser`, `memberRunView`, `superadminRunView`,
     `summarizeRun`, `compareRun`, `readRunStages`, `readTurns`, `deleteRun` (cascade),
     `setArchived`, `cloneRun` (insert-select + artifact copy), pipeline-lock reads.
3. **`pgRunsRepo`** in `runs.repo.ts`, chosen at module load like `session-runtime.ts:59`.
4. **Sidecars → columns:** `readReview/writeReview`, rating and archive move to id-based
   interface methods that update the `sessions.review/rating/archived_at` columns
   (file impl keeps resolving the dir internally).
5. **Session reads:** boot restore DB-FIRST (flip of today's order in `backend/api/sessions.ts
   startSweep`); `getSession` miss path → DB `readSession`, then disk (disk fallback stays until
   Phase 7).
6. **Other readers:** `suggest-fix.repo.ts` → `readArtifact(id, stage, "prompt.md"/"response.json")`;
   `pipeline.repo.ts` headline → latest session row; `person-profile.ts collectPersonRuns` → SQL
   by person. `review-html.ts` + the reviewrun skill stay disk-based (dev-only, covered by echo).

`fileRunsRepo` stays alive — it's the DB-less dev mode and the test substrate.

## The parity test (the most valuable test in the workstream)

Seed one fixture run through the write path, then deep-equal the outputs of `fileRunsRepo` vs
`pgRunsRepo` for EVERY read method. Any row-shape drift that would break the admin UI fails here,
not on Carl's screen. Runs only with a test DATABASE_URL (skip pattern from `test-pg-roundtrip.js`).

## Files

`backend/api/services/runs/runs.repo.ts` + `runs.service.ts` · new `backend/db/runs-store.ts`
(+ mirrored test) · `backend/api/sessions.ts` · `backend/api/session-persistence.ts` ·
`backend/api/services/suggest-fix/suggest-fix.repo.ts` · `backend/api/services/pipeline/pipeline.repo.ts` ·
`backend/engine/person-profile.ts` · dedicated fencing tests per list variant.

## QA scenarios (Carl)

1. I temporarily rename `logs/` aside. Then in the admin UI: Library list, run detail, stage tabs,
   compare view, the review tool, star rating, archive/unarchive, delete, member "Past 1:1s",
   superadmin views — **all work from the DB alone**. Then `logs/` comes back.
2. Restart the server mid-1:1 and continue the session (restore comes from the DB now).
3. Privacy spot-check: a member sees only their own runs; a manager only their org's.

## Rollback

One line — flip the repo selection back to `fileRunsRepo` (same switch pattern as sessions).
Disk copies are still complete (echo on).

## Risks

- Fencing regression = privacy leak → dedicated per-variant tests + parity test; treat this
  phase as a security review.
- Sync→async ripple wider than expected → Map stays sync; convert lane by lane.
