# Phase 3 — backfill existing runs + fold in aliases

## BUILT — awaiting Carl's walk (2026-07-06)

- **New `scripts/backfill-people.ts`** (dev-guarded: refuses in production, requires `DATABASE_URL`; `--dry-run` writes nothing; idempotent). Walks `walkRuns()`; for each run with orgId+userId+ctx.name it resolves the name through the manager's alias sidecar, find-or-creates the roster row (reusing `peopleService.resolveForRun`, which dedupes by normalized name), stamps `personId` into `session-state.json` atomically (temp+rename), and mirrors the updated state into Postgres via `upsertSession`. Runs already carrying a `personId` are skipped → re-running reports 0 new stamps.
- **Alias resolution is a pure module** — `backend/api/services/team/alias-resolve.ts` (`normalizeKey`, `canonicalKeyOf`, `aliasedPersonName`): merge chains collapse to the canonical key, a rename override wins, an un-merged name keeps its casing. Every run for one person yields the same filed name — the dedupe invariant. **Unit-tested test-first (8 cases), no DB.** `normalizeKey`/chain-walk deliberately duplicate team.service's private copies rather than refactor a working shared file.
- **Offline proof (all free, $0):** `npm test` **78/79** (the single fail is the pre-existing `test-replay-regression` baseline drift — confidence/evidence_basis fields only, unrelated to this work), root + admin typecheck clean, and the script's dev/DATABASE_URL guards both fire.
- ⚠️ **Not live-verified — this cloud clone has no `DATABASE_URL`.** The dry-run preview + real run against the roster (QA scenarios 1–4) are Carl's walk on his Neon-connected machine. The script prints per-run `"name" → CREATE/reuse person "..."` lines so the dry run is eyeball-able before any write.

## Work

New `scripts/backfill-people.ts` (dev-guarded like seed-runs.ts; requires DATABASE_URL; idempotent; `--dry-run` flag):

- walkRuns() → for each run with orgId + userId + ctx.name:
  - Load that manager's alias file (`content/data/people-aliases/{userId}.json`); resolve canonicalKeyOf(name) + display-name override.
  - Find-or-create the people row for (managerId, canonical name).
  - Write personId into the run's session-state.json (atomic temp+rename, same pattern as setArchived) AND upsert the matching `sessions.state` row via session key so the DB mirror doesn't drift.
- Alias files left in place as read-only history — roster rows are now the truth.

## Done when

- Every finished run owned by a real user has personId.
- Roster shows the same people the Team page showed (aliases honored).
- Re-running the script changes nothing (idempotent).
- Verified against the actual store: query the people table + read a stamped state.json (not just script output).

## QA scenarios

1. `--dry-run` first: eyeball the plan output (who gets created, which runs stamped).
2. Real run: the seeded member's demo runs (Grace, Daniel, Marcus, Nina, Sofia, Samira…) map to distinct people rows under that account.
3. A run whose name was alias-merged lands on the canonical person, not a duplicate.
4. Run the script twice → second run reports 0 changes.
