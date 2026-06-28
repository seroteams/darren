# Phase 2 — First migration + schema (Drizzle)

**Part of:** [PLAN.md](PLAN.md) · **Tool:** Drizzle (locked) · **Status:** ⬜

## Goal
Create the database **shape** for the 5 tables — `organizations`, `users`, `sessions`, `runs`,
`invitations` — as a **TypeScript schema** plus a **versioned SQL migration** that Drizzle generates from
it. One file describes the tables; one generated migration builds them. **No repos are swapped yet** (that
is Phase 3) and **no live Postgres is required yet** (that arrives in Phase 4) — this phase is the schema +
the migration that everything else stands on.

## What you'll have when it's done
- `backend/db/schema.ts` — the 5 tables in plain TypeScript, following the locked DB rules.
- `backend/db/migrations/0000_*.sql` — the **versioned migration** Drizzle generated from that schema
  (readable SQL you can open and check), plus Drizzle's `meta/` journal.
- `drizzle.config.ts` — points Drizzle at the schema + migrations folder + `DATABASE_URL`.
- `package.json` scripts: `db:generate` (schema → new migration) and `db:migrate` (apply migrations to a
  DB — used live in Phase 4).
- Drizzle installed: `drizzle-orm`, `drizzle-kit` (dev), the `pg` driver (+ `@types/pg`).
- `npm test` still **46/46**; `npm run typecheck` clean.

## The 5 tables (the locked rules applied)
All: `uuid` primary keys (generated), `snake_case` plural names, `timestamptz` for `created_at` /
`updated_at`, `jsonb` (never `text`) for structured data, an indexed `org_id` FK on every tenant table,
and FK + index on every `*_id`.

- **organizations** — `id`, `name`, `created_at`, `updated_at`. (The tenant root.)
- **users** — `id`, `org_id`→organizations, `email` (unique), `name`, `role` enum
  (`owner`/`admin`/`member`, default `member`), `password_hash` (**nullable** — nothing logs in until
  Phase 006), `created_at`, `updated_at`.
- **sessions** — `id`, `org_id`→organizations, `state` **jsonb** (the live session object), `log_dir`
  (the on-disk run folder this session writes), `created_at`, `updated_at`, `completed_at` (nullable).
- **runs** (index → on-disk logs) — `id`, `org_id`→organizations, `session_id`→sessions (nullable),
  `log_dir` (path to the on-disk artifacts that **stay on disk**), `label`, `status`, `created_at`. The
  heavy `inputs.json` / `prompt.md` / `response.json` / transcripts are **not** moved — this row just
  points at them.
- **invitations** (scaffold for Phase 006) — `id`, `org_id`→organizations, `email`, `role` enum,
  `status` enum (`pending`/`accepted`/`revoked`, default `pending`), `invited_by`→users (nullable),
  `created_at`, `expires_at` (nullable). Table exists now; the resend/expiry **feature** is later.

## One honest implementation note (decided here, applied in Phase 3)
Today a session's `id` is a **string derived from its on-disk run folder**, not a uuid. The schema above
gives `sessions.id` a uuid and keeps the on-disk folder in `log_dir`. Mapping the existing string id onto
this (mint a uuid + keep the folder, vs. keep a `legacy_id text` column) is a **Phase 3** decision — the
schema is built to allow either, and this note exists so the choice is surfaced, not silently made.

## Not in this phase
- Swapping any repo file → Postgres (Phase 3).
- The connection pool / `backend/db/client.ts` actually opening a connection (Phase 3).
- `docker-compose`, a running Postgres, applying the migration to a live DB (Phase 4).
- Auth / login / password logic (Phase 006).

## Done when
- [ ] `backend/db/schema.ts` defines all 5 tables per the locked rules; `npm run typecheck` is clean.
- [ ] `npm run db:generate` produces a versioned SQL migration under `backend/db/migrations/`, and the
      generated SQL reads correctly (uuid PKs, `timestamptz`, `jsonb`, `org_id` FKs + indexes, enums).
- [ ] `npm test` is still **46/46** (the schema is inert — it changes no existing behaviour).
- [ ] Product owner has read the schema + the generated SQL and said go.

## Test scenarios — for the product owner (all free, offline — no DB, no OpenAI)
Walk these yourself. The next phase waits for your green light.
1. **Read the schema** — open [backend/db/schema.ts](../../../backend/db/schema.ts). You should recognise
   all 5 tables and see the locked rules in plain TypeScript (uuid ids, `snake_case`, `jsonb` for state,
   `org_id` on tenant tables). ❌ Not OK if a table or a rule is missing.
2. **Read the generated SQL** — open the file under `backend/db/migrations/`. It should be readable
   `CREATE TABLE` SQL that matches the schema — no hidden magic. This is the "you can see the SQL"
   promise of choosing Drizzle.
3. **Nothing else moved** — `npm test` is still **46/46** and the app behaves exactly as before; this
   phase only *describes* tables, it doesn't switch any storage over yet.
4. **Scope is still right** — the run-history artifacts stay on disk (the `runs` row only points at
   them). ❌ Not OK if you expected the logs themselves to move into the DB.

→ **Green light** = I commit Phase 2 (local) and start **Phase 3** (connection pool + swap the
`SessionsRepo`/`UsersRepo` file → Postgres behind the same interface).
