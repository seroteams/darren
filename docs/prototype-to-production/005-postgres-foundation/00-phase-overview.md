# Phase 005 — Postgres Foundation (conventions + migrations)

## Goal (plain)
Introduce a real database (Postgres) for the things that need it — **organisations, users, and
sessions** — with clear, robust rules and proper, industry-standard **migrations**. The big run-history
files stay on disk; only the live, operational data moves into the database.

## What you'll have when it's done
- A `backend/db/` area: a connection pool, the schema, and **migrations** managed by a modern, popular
  tool for our stack (TypeScript) — e.g. **Drizzle** or **Prisma** (we pick one in this phase and log
  the choice). Every create/change ships as a **versioned migration file** — never a hand-edit to a live database.
- Tables for **organizations**, **users**, **sessions**, **runs** (an index that points at the on-disk
  logs), and **invitations** (scaffolded now for later — see Phase 006).
- The session/user repos from Phase 004 **swapped from file-backed to Postgres**, behind the same
  interface, so the services don't change.
- Local Postgres via `docker-compose`, and a `DATABASE_URL` setting.

## The database rules we're locking in (clear + robust)
- **Table names:** `snake_case`, plural — `organizations`, `users`, `sessions`, `invitations`.
- **Column names:** `snake_case` — `created_at`, `org_id`, `password_hash`.
- **Primary keys:** `uuid` (generated) — safer than incrementing integers for a multi-company product.
- **Timestamps:** `timestamptz` — `created_at`, `updated_at` (set by the database).
- **Structured data:** **`jsonb`, never `text`** (e.g. session state, axis state) — so it's queryable and robust.
- **Multi-tenant:** every tenant-scoped table carries an `org_id` foreign key, indexed.
- **Always:** foreign keys + indexes on every `*_id`; `NOT NULL` with sensible defaults; fixed sets
  (roles, invite status) as enums/lookups.

## A grounding example (before → after)
- **Before:** a session is a file at `logs/june/2026_Jun19_…/session-state.json`.
- **After:** that session is a row in `sessions` — `id uuid`, `org_id uuid` (FK), `state jsonb`,
  `created_at timestamptz`. Restart the server and it's still there, loaded from the database. The
  detailed stage logs still live in `logs/…`, linked by id.

## Why logs stay on disk (scoping note)
The per-stage artifacts (`inputs.json`, `prompt.md`, `response.json`, transcripts) are large and are
read by the engine, the `reviewrun` skill, and the regression tests. Moving all of that into the DB now
would be big and risky. **DB owns organisations + users + sessions; files keep the run artifacts**, indexed by a `runs` row.

## The steps (to be detailed when this phase starts)
1. Choose the migration tool (Drizzle/Prisma) and log the decision.
2. Write the first migration: `organizations`, `users`, `sessions`, `runs`, `invitations`.
3. Add the connection pool; swap the session/user repos to Postgres (same interface as Phase 004).
4. Add `docker-compose` for local Postgres.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Migrations build the database from clean with one command.
- Create a session, restart the server, and it's restored **from the database**.
- `npm test` stays green; a teammate can spin up the DB from the documented command.

## Note
Depends on Phase 004 (the repo seam) and Phase 003 (typed code).

> **Status:** overview only. Detailed step files get written when we start this phase.
