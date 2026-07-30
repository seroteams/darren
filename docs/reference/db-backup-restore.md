# Database backup & restore (audit F2)

The one-page recovery runbook. Sero's live database is Postgres (Neon), and it is the only
copy of every run, transcript, prompt, model reply and generated question. Before this,
a script existed but had never been run and nothing was scheduled: an accidental delete,
a bad migration or a lost Neon project had no undo. This closes that.

## The nightly copy (set up 2026-07-30)

A Windows scheduled task, `SeroNightlyBackup`, runs at **02:30 daily** and catches up if
the laptop was asleep. It backs up **live first**, then local, prunes sets older than 14
days, and appends one line per run to `backups/backup.log`.

```
npm run backup:nightly            # run it now, by hand
npm run backup:nightly:install    # register / re-register the 02:30 schedule
npm run backup:nightly:uninstall  # remove the schedule (backups are kept)
```

Check it is still alive: the last two lines of `backups/backup.log` should be a recent
`OK live` and `OK local`. A `SKIP live` line means live is **not** being backed up.

### The live URL

`scripts/backup-nightly.ps1` reads the live connection string from
`.secrets/live-database-url` (gitignored, never printed). Render's dashboard is the source
of truth; this file is a local copy so the unattended job can run. To create or refresh it:

```
KEY=$(cat .secrets/render-api-key); SID=$(cat .secrets/render-service-id); curl -s -H "Authorization: Bearer $KEY" "https://api.render.com/v1/services/$SID/env-vars?limit=50" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const r=(Array.isArray(j)?j:[]).find(x=>(x.envVar&&x.envVar.key)==='DATABASE_URL');if(!r){console.error('DATABASE_URL not found on the service');process.exit(1)}require('fs').writeFileSync('.secrets/live-database-url',r.envVar.value);console.log('saved .secrets/live-database-url')})"
```

If Render's `DATABASE_URL` is ever rotated, run that again or the nightly job will keep
backing up the old database.

## Take a backup by hand (free, safe on live)

```
npm run backup                 # uses DATABASE_URL, or the one in .env
npm run backup -- --label live
```

Read-only, so it is safe against live. Run it before any risky migration or bulk change.

Two formats, picked automatically:

| Condition | Output | Restored with |
|---|---|---|
| `pg_dump` on PATH | `backups/sero-<label>-<stamp>.dump` | `pg_restore` |
| `pg_dump` missing | `backups/sero-<label>-<stamp>/` — one gzipped NDJSON file per table plus `manifest.json` | `npm run backup:restore` |

**This machine has no Postgres client tools, so the NDJSON path is the live one.** It is
data-only by design: the schema half of a restore comes from the committed migrations, and
`manifest.json` records which migration the data was taken at. Compression matters here —
`run_artifacts` alone is ~1 GB raw and ~370 MB gzipped.

`backups/` is git-ignored. Keep dumps off the repo.

## Check a backup is trustworthy

```
npm run backup:restore -- --from backups/sero-live-20260730-000922 --verify-only
```

Reads every table file back, parses it, and compares the row count to `manifest.json`.
Writes nothing. This is the check to run if you ever want to know the copies are real.

## Restore a backup

Restoring **overwrites data**. Only ever restore into a database you mean to replace, and
never restore live over live without a current backup in hand first.

```
# 1. build the schema on the target (empty DB), at the manifest's migration:
DATABASE_URL="<TARGET>" npm run db:migrate

# 2. dry run — prints what it would do, writes nothing:
npm run backup:restore -- --from backups/sero-live-<stamp> --to "<TARGET>"

# 3. do it:
npm run backup:restore -- --from backups/sero-live-<stamp> --to "<TARGET>" --yes
```

Dry run is the default; `--yes` is required to write. Tables are emptied children-first
and reloaded parents-first from the order recorded in the manifest.

For a `.dump` file (only if Postgres client tools get installed later):

```
pg_restore --no-owner --clean --if-exists -d "<TARGET_DATABASE_URL>" backups/sero-<stamp>.dump
```

## Neon's own safety net

Neon keeps point-in-time history on its paid tiers (and a shorter window on free/launch).
That is the fastest recovery for "undo the last few minutes".

- **Live branch PITR window:** _(still to fill in from the Neon dashboard)_

The nightly copies above are the belt-and-braces that survive even if the Neon project
itself is lost.

## Known gap

Every copy currently lands on **one laptop**. That protects against a Neon accident but not
against the laptop dying. An off-machine destination (cloud storage, or a GitHub Action
running the same script) is the next step and is not done.
