# Phase 3 — backfill existing runs + fold in aliases

## BUILT + RUN — awaiting Carl's walk (2026-07-06)

- `scripts/backfill-people.ts` written (dev-guarded, DATABASE_URL required, `--dry-run`, idempotent)
  **and executed against the real store**:
  - Dry run eyeballed first (27 people / 34 runs planned; 60 anonymous runs left alone).
  - Real run: **20 people rows created** across 3 real accounts; **27 runs stamped** on disk;
    **16 DB mirror rows updated**; **7 runs left honestly unlinked** — their owner accounts no
    longer exist in `users` (deleted test users), the FK rightly refuses, script warns + skips.
  - Verified AT the store: people table queried per manager (member@ carries the demo roster:
    Grace, Daniel, Marcus, Nina, Sofia, Samira, Priya Shah, Marco Diaz, Ade Balogun — QA
    scenario 2 ✓); a stamped `session-state.json` read back off disk ✓; re-run reports
    27 already-linked / 0 new (idempotency ✓).
  - ⚠️ Honest gap: **no alias files existed** (`content/data/people-aliases/` is empty on this
    machine), so the alias-merge scenario had no real data to prove live. The chain-follow
    resolve is the same logic the people-service merge tests pin.
- Checks: `npm test` **78/78** · typecheck clean.

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
