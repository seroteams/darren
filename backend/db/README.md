# Database (Postgres) — setup

The live, operational data — **organizations, users, sessions** — lives in Postgres.
The heavy per-run logs stay on disk (in `logs/…`), indexed by a `runs` row.

If no database is configured, the app **falls back to on-disk JSON files** automatically —
so you can run everything with no database at all. The database is what makes sessions
survive a server restart and be safe for multiple users.

## One-time setup (managed Postgres — ~3 minutes)

We use a managed Postgres provider so there's nothing to install locally.

1. Create a free database at a managed provider (e.g. **[Neon](https://neon.tech)** free tier):
   sign up → **Create project** → copy the **connection string** it shows you. It looks like:
   `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`
2. Add it to your local `.env` (this file is gitignored — never commit it):
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
   ```
3. Build the tables from clean:
   ```
   npm run db:migrate
   ```
   That applies every versioned migration in `migrations/` and creates the 5 tables.
4. Run the app as usual (`npm run dev`). With `DATABASE_URL` set, sessions are stored in
   Postgres and **survive a restart**; with it unset, the app uses files.

## Day-to-day

- **Change the schema:** edit `schema.ts`, then `npm run db:generate` to create a new
  versioned migration, then `npm run db:migrate` to apply it. Never hand-edit a live database.
- **Verify the database round-trip (free, no OpenAI):**
  `node backend/tests/sessions/test-pg-roundtrip.js` — writes a session, wipes memory, and
  reads it back from the database. It skips automatically when `DATABASE_URL` is unset.

## Layout

- `schema.ts` — the 5 tables in TypeScript (the source of truth Drizzle reads).
- `migrations/` — generated, versioned SQL migrations (committed).
- `client.ts` — the connection pool (opens lazily; never connects when `DATABASE_URL` is unset).
- `sessions-store.ts` — the durable read/write/boot-restore layer for sessions.

## The 5 tables

`organizations`, `users`, `sessions`, `runs` (an index pointing at the on-disk logs),
`invitations` (scaffolded for the auth phase). Rules: `uuid` primary keys, `snake_case`
plural names, `timestamptz` timestamps, `jsonb` for structured state, an indexed `org_id`
on every tenant table.

> **Security:** the real `.env` holds live credentials and is gitignored — never commit it,
> and never paste a connection string into chat or a ticket. If one leaks, reset the
> password in the provider dashboard and update `.env`.
