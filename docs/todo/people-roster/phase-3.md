# Phase 3 — backfill existing runs + fold in aliases

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
