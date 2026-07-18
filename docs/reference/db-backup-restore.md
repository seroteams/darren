# Database — backup & restore (audit F2)

The one-page recovery runbook. Sero's live database is Postgres (Neon). Before this,
there was no backup script and no written restore path — an accidental delete or a bad
migration had no undo. This closes that.

## Take a backup (free, safe on live)

```
node scripts/backup-db.js
```

Writes a compressed, restorable dump to `backups/sero-YYYYMMDD-HHMMSS.dump`. It only
reads the database, so it's safe to run against live. Needs the Postgres client tools
(`pg_dump`) on PATH. `backups/` is git-ignored — keep dumps off the repo.

**When to run it:** before any risky migration or bulk change; and on a schedule
(cron / a GitHub Action calling the same script) once the pilot has real customer data.

## Restore a backup

Restoring OVERWRITES data — only ever restore into a database you mean to replace
(a fresh/empty one, or a deliberate rollback). Never restore live over live without a
current backup in hand first.

```
# into a fresh/empty database:
pg_restore --no-owner --clean --if-exists -d "<TARGET_DATABASE_URL>" backups/sero-YYYYMMDD-HHMMSS.dump
```

- `--clean --if-exists` drops existing objects first, so a restore into a non-empty DB
  replaces rather than collides.
- `--no-owner` ignores the dump's original role, so it restores cleanly under whatever
  user the target URL uses.

## Neon's own safety net

Neon keeps point-in-time history on its paid tiers (and a shorter window on free/launch).
That is the fastest recovery for "undo the last few minutes" — check the retention window
for the live branch in the Neon dashboard and record it here once confirmed:

- **Live branch PITR window:** _(fill in from the Neon dashboard)_

The `pg_dump` file above is the belt-and-braces copy that survives even if the Neon
project itself is lost.
