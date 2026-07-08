# Phase 3 — Read cutover: the app trusts the DB, not the files

**Status:** 🔨 BUILT 2026-07-09 ($0, test-first) — awaiting Carl's walk

## Build results (2026-07-09)

Every run read now comes from Postgres when `DATABASE_URL` is set; the file walk
stays the DB-less mode AND the rollback (flip = the one-line repo selection in
[runs.repo.ts](../../../backend/api/services/runs/runs.repo.ts)).

- **Write path completed first** (the P2 deferral): per-turn files
  (`NN-turn.json` / `NN-prompt.md` / `NN-response.json`), `transcript.json`,
  `axis-state.json`, `cost.json` and **pipeline-lock.json** all go through new
  `logTurn` / `logRunRoot` funnels in [session.ts](../../../backend/engine/session.ts)
  (all three lanes: web, persona, CLI) — DB always, disk only when the echo is on.
  This also stops the live deploy writing turn files to Render's ephemeral disk.
- **New [backend/db/runs-store.ts](../../../backend/db/runs-store.ts)** — every
  run-history read as SQL, **double-fenced**: SQL narrows on the indexed columns,
  then every row is re-checked with the engine's OWN wall functions
  (`runOwnedByOrg` / `runOwnedByUser` / `memberRunVisible`) against the
  authoritative `state` jsonb — a drifted index column can hide a run, never leak
  one. Shapes come from the same exported run-history helpers the file store uses.
- **Async seam:** `RunsRepo` is Promise-returning with **id-based** review/rating
  (columns on `sessions`; sidecar writes also echo to disk while echo is on, so a
  rollback to files loses nothing). Controllers await; superadmin / about-me /
  pipeline / suggest-fix readers all select pg-vs-file on `hasDatabaseUrl()`.
- **Boot restore is DB-first** — disk only fills gaps afterwards.
- **The parity test** ([test-pg-runs-parity.js](../../../backend/tests/runs/test-pg-runs-parity.js)):
  one run seeded through the REAL write funnel, then **11 reads deep-equalled**
  across both stores (finished row, summarize, compare, stages incl. per-turn
  prompt/raw, member view, member list, superadmin drilldown + view, recent row
  incl. the lock digest, rating, review) — **all green on the real Neon DB**.
  Skips without DATABASE_URL. Plus 7 DB-less **fencing unit tests** per list
  variant ([runs-store.test.ts](../../../backend/db/runs-store.test.ts)) and 4
  funnel tests ([session-log.test.ts](../../../backend/engine/session-log.test.ts)).

### Honest deferrals (same pattern as Phase 2's)
- **`getSession` miss → DB fallback:** boot restore covers the QA restart
  scenario; the Map-miss path (a >2h-idle unfinished run resuming on live) needs
  the sync `SessionsRepo.get` lane converted to async — the plan's own
  "convert lane by lane" risk. Deferred to Phase 7 with the disk fallback intact.
- **`person-profile.ts collectPersonRuns`:** moves with its people-profiles store
  in Phase 5 (dev tooling, covered by the echo — like review-html/reviewrun).
- **Suggest-fix semantics:** an unknown run is now 404 at `readState` (was 409
  when the dir existed but state was unreadable) — more honest, noted here.

### ⚠️ What Carl will SEE locally until Phase 6
The admin Library / Runs lists now read the DATABASE — which holds only runs
made since P2's dual-write (2026-07-08). **The ~250 older disk runs disappear
from the lists until Phase 6 imports them.** Nothing is deleted — they're all
still on disk, and the one-line rollback brings them back instantly.

**Checks:** whole-tree `npm test` + 3 typechecks (results in STATUS) · offline
replay PASS · parity 12/12 · $0 spend.

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
