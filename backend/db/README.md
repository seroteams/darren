# Database (Postgres) — setup

ALL app data lives (or is moving) into Postgres — organizations, users, sessions/runs,
and (as the postgres-runtime-data workstream lands) run artifacts, generated questions,
role profiles, and the other runtime stores. Files become an optional local echo.

If no database is configured, the app **falls back to on-disk JSON files** automatically —
so you can run everything with no database at all. The database is what makes data
survive a restart, be safe for multiple users, and be identical across live and local.

## Two environments, two databases

**Live and local NEVER share a database.**

- **Live** (the deployed app) points at the main Neon database, with `APP_ENV=live`.
- **Local** (your dev machine) points at a **second Neon database** (or any local
  Postgres), with `APP_ENV=local` (or unset — local is the default).

The database remembers which environment first claimed it (an `app_state` row written on
first boot). On every boot the app compares that marker against `APP_ENV` and **refuses to
start on a mismatch** — so a copied `.env` can never point local dev at live data.
`ALLOW_ENV_MISMATCH=1` overrides it; that's reserved for the deliberate history import.

To create the second (local) database on Neon: dashboard → your project → **Databases →
New database** (or create a second project) → copy its connection string into your local
`.env` as `DATABASE_URL`.

## One-time setup (managed Postgres — ~3 minutes)

We use a managed Postgres provider so there's nothing to install locally.

1. Create a free database at a managed provider (e.g. **[Neon](https://neon.tech)** free tier):
   sign up → **Create project** → copy the **connection string** it shows you. It looks like:
   `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`
2. Add it to your local `.env` (this file is gitignored — never commit it):
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
   APP_ENV=local
   ```
3. Build the tables from clean:
   ```
   npm run db:migrate
   ```
   That applies every versioned migration in `migrations/`.
4. Run the app as usual (`npm run dev`). With `DATABASE_URL` set, data is stored in
   Postgres and **survives a restart**; with it unset, the app uses files.

## Day-to-day

- **The API server migrates itself on boot** — pending migrations apply automatically
  before it starts listening (`backend/db/migrate.ts`). `npm run db:migrate` stays for
  manual use; the CLI does NOT auto-migrate and tells you to run it when behind.
- **Change the schema:** edit `schema.ts`, then `npm run db:generate` to create a new
  versioned migration; the next server boot (or `npm run db:migrate`) applies it.
  Never hand-edit a live database.
- **Verify the database round-trip (free, no OpenAI):**
  `node backend/tests/sessions/test-pg-roundtrip.js` — writes a session, wipes memory, and
  reads it back from the database. It skips automatically when `DATABASE_URL` is unset.
- **Verify live/local alignment (free, read-only, no OpenAI):**
  `node scripts/db-alignment-check.ts` — connects to the local database (`DATABASE_URL`)
  and the live one (`LIVE_DATABASE_URL`, parked in `.env`) and reports ✅/❌ per rule:
  right environment markers, both carrying exactly the repo's migrations (including the
  `0012_alignment_probe` marker row), same migration head on both sides. Exits 1 on drift.

## Layout

- `schema.ts` — every table in TypeScript (the source of truth Drizzle reads).
- `migrations/` — generated, versioned SQL migrations (committed).
- `client.ts` — the connection pool (opens lazily; never connects when `DATABASE_URL` is unset).
- `migrate.ts` — boot-time migration runner (server only).
- `env-guard.ts` — the live/local safety catch (the environment marker check).
- `sessions-store.ts` — the durable read/write/boot-restore layer for sessions.

## The tables

`organizations`, `users`, `people`, `sessions` (= the run: state jsonb + denormalized
index columns + review/rating/archived), `run_artifacts` (what used to be the files in a
run dir), `generated_questions` (the invented-question pool; UNIQUE alias = the dedup
gate), `role_profiles`, `arc_overlays`, `people_profiles`, `people_aliases`,
`lexicon_candidates`, `audit_log`, `app_state` (environment marker + tiny counters),
`invitations`, `auth_sessions`, `feedback_notes`, `error_logs`.

Rules: `uuid` primary keys, `snake_case` plural names, `timestamptz` timestamps, `jsonb`
for structured state, an indexed `org_id` on every tenant table. One documented
exception: `sessions.user_id` / `sessions.person_id` are indexed but not FK'd — they are
denormalized snapshots that may reference deleted users (old runs keep their owner id).

> **Security:** the real `.env` holds live credentials and is gitignored — never commit it,
> and never paste a connection string into chat or a ticket. If one leaks, reset the
> password in the provider dashboard and update `.env`.
