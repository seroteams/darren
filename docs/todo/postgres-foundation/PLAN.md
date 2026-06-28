# Postgres Foundation (Prototype → Production · Phase 005)

**Goal:** Move the live, operational data — **organisations, users, and sessions** — out of loose JSON
files and into a real **Postgres** database, with clear rules and proper **versioned migrations**. Same
behaviour as today; the difference is data now survives a restart and is safe for multiple real users.
(The heavy run-history logs stay on disk, indexed by id.)
**Driver:** Carl
**Created:** 2026-06-28
**Tracks:** the bigger plan in
[../../prototype-to-production/005-postgres-foundation/00-phase-overview.md](../../prototype-to-production/005-postgres-foundation/00-phase-overview.md).
When this is done + approved, set that effort's `PROGRESS.md` (Phase 005 → `done`).

> ### ⛔ Gate — building waits on Phase 004 sign-off
> Phase 005 **swaps the very repos Phase 004 built** (file-backed → Postgres) *behind the identical
> interface*. Its overview says it plainly: **"Depends on Phase 004 (the repo seam)."** Phase 004 is
> **built but not yet owner-walked/approved**. If the seam moves during your 004 walk, 005 work churns —
> so **no 005 code lands until you approve 004.** This folder is the *plan*, scaffolded ahead (at Carl's
> request, 2026-06-28) so we move the moment 004 is green. Planning is $0 and skips no gate.

## Done means
- A **`backend/db/`** area: a connection pool, the schema, and **versioned migration files** managed by
  one chosen tool (Phase 1 — Drizzle or Prisma; the choice is logged).
- Tables for **organizations**, **users**, **sessions**, **runs** (an index pointing at the on-disk
  logs), and **invitations** (scaffolded now for Phase 006).
- The Phase-004 **session/user repos swapped file → Postgres**, behind the **same interface** — the
  services don't change.
- Local Postgres via **`docker-compose`** + a **`DATABASE_URL`** setting.
- **One command builds the DB from clean.** Create a session, restart the server, and it's restored
  **from the database**.
- `npm test` stays green; a teammate can spin up the DB from the documented command.
- **Owner-walked:** Carl sees a session persist across a server restart, and can describe the file→DB
  swap as "same interface, different storage."

## Out of scope (park it)
- **Moving run-history artifacts** (`inputs.json` / `prompt.md` / `response.json` / transcripts) into the
  DB — they stay as files, indexed by a `runs` row. (Overview scoping note — large, risky, read by the
  engine + `reviewrun` + the gate.)
- **Auth / login / password logic** — that's **Phase 006**. This phase only *creates* the `users` +
  `invitations` tables as the foundation; nothing logs in yet.
- **Real org/role enforcement in the app** — tables + `org_id` columns land now; enforcing them is 006+.

## The database rules we lock in (from the standing standards)
- **Table names:** `snake_case`, **plural** — `organizations`, `users`, `sessions`, `runs`, `invitations`.
- **Column names:** `snake_case` — `created_at`, `org_id`, `password_hash`.
- **Primary keys:** **`uuid`** (generated) — safer than auto-increment for a multi-company product.
- **Timestamps:** **`timestamptz`** — `created_at`, `updated_at` (set by the database).
- **Structured data:** **`jsonb`, never `text`** (session state, axis state) — queryable + robust.
- **Multi-tenant:** every tenant-scoped table carries an **`org_id`** foreign key, **indexed**.
- **Always:** FKs + indexes on every `*_id`; `NOT NULL` with sensible defaults; fixed sets (roles, invite
  status) as **enums/lookups**.

## The phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | **Choose the tool + lock the conventions** | Drizzle-vs-Prisma **decided & logged** (= Drizzle); the DB rules above confirmed against the schema we'll write. **No code.** | ✅ |
| 2 | First migration + schema | The 5 tables as a **versioned migration**; builds from clean with one command; `npm test` green. | ✅ |
| 3 | Connection pool + repo swap | `backend/db` pool; `SessionsRepo` (+ a small `UsersRepo`) swapped file → Postgres **behind the same interface**; services untouched; tests green. | 🔨 *needs DB-run pick* |
| 4 | docker-compose + `DATABASE_URL` + docs | Local Postgres **one-command up**; a teammate can follow the README; the restart-persistence walk passes. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (you tested + said go)

> Detailed `phase-2/3/4.md` step files (each ending in owner QA scenarios) get written **after** you lock
> the Phase-1 tool decision — same rhythm as Phase 004 (we didn't guess the shape before the menu was
> locked). Reason: **Drizzle and Prisma produce very different file layouts**, so the later steps can't be
> written precisely until the tool is chosen.

---

## The one decision that gates everything — **Drizzle vs Prisma**

Both are modern, popular, well-maintained TypeScript database tools. Both give us **versioned SQL
migrations**, **uuid / jsonb / timestamptz**, and work with a normal Postgres connection pool. Either one
satisfies **every** DB rule above. The difference is *fit with how this codebase is already built*.

| | **Drizzle** *(recommended)* | **Prisma** |
|---|---|---|
| Where the schema lives | **In TypeScript** — one language, no extra DSL file | In its own `schema.prisma` DSL file (a second language to learn) |
| How it feels | **SQL-first** — you see the SQL it runs; thin layer | Batteries-included; generates a client that *wants to be* your data layer |
| Fit with our Phase-004 repo seam | **Drops cleanly behind** the hand-written `SessionsRepo` | Its generated client slightly *competes with* a hand-written repo |
| Runtime weight | Lightweight, no extra binary | Heavier; historically ships a separate query engine |
| Migrations | Readable, versioned SQL files (`drizzle-kit`) | Versioned SQL files (`prisma migrate`) + a great visual studio |
| Honesty fit (this project's ethos) | **High** — no hidden magic, you read the SQL | Lower — more happens behind the generated client |

**My recommendation: Drizzle.** Three reasons specific to *us*:
1. **One language.** Our standard is "all TypeScript, tight contracts." Drizzle's schema *is* TypeScript;
   Prisma adds a separate `.prisma` DSL as a second source of truth.
2. **It fits the seam we just built.** Phase 004's whole point was a clean hand-written repo boundary.
   Drizzle slides *behind* it untouched; Prisma's generated client is designed to *be* the data layer, so
   it pulls against that design.
3. **You can see the SQL.** This codebase prizes honesty — surface what's really happening, no hidden
   rewrites. Drizzle is SQL-first; Prisma hides more behind its client.

**When you'd pick Prisma instead:** if we wanted the most hand-holding DX and a visual data browser
(Prisma Studio) and *didn't* already have a repo seam. We do have one, so Drizzle wins here.

**This is yours to lock** — it's a long-lived foundation choice (same as you locking the `/api/v1/`
contract D1–D5 in Phase 004). Tell me **Drizzle** (or **Prisma**) and I log it and write the Phase-2/3/4
detail.

---

## Current state
> ### 📋 2026-06-28 — Phase 2 ✅ signed off · Phase 3 starting — **blocked on a DB-run decision**
> Carl walked Phase 2's QA and approved ("QA done, seems fine! Lets go!"). Phase 2 committed + pushed to
> `main`. Phase 3 (connection pool + repo swap) opened — but its round-trip proof needs a running Postgres,
> and **Docker is not installed on this machine**. Surfaced the choice of how to run the DB (Docker Desktop
> vs a no-Docker in-process test DB vs a native/managed Postgres) before writing the pool/repo code.
> Still all free/offline — no OpenAI. **Next:** Carl picks the DB-run path, then Phase 3 code + round-trip.

> ### 📋 2026-06-28 — Phase 2 (first migration + schema) **built — awaiting Carl's QA**
> Phase 004 is signed off and the tool is locked (**Drizzle**), so the build is unblocked. Wrote the
> detailed `phase-2/3/4.md` step files in Drizzle's shape, then built Phase 2:
> - **Installed:** `drizzle-orm`, `pg`, `drizzle-kit` (dev), `@types/pg` (dev). *(1 pre-existing high npm
>   advisory; drizzle-kit's dev-only chain adds a few moderate — noted, not actioned.)*
> - **Schema:** `backend/db/schema.ts` — all 5 tables in plain TypeScript per the locked rules.
> - **Migration:** `npm run db:generate` produced `backend/db/migrations/0000_glorious_sunset_bain.sql` —
>   readable SQL: uuid PKs (`gen_random_uuid()`), `timestamptz`, `jsonb`, enums, `org_id` FKs + indexes,
>   unique email. `drizzle.config.ts` + `db:generate`/`db:migrate` scripts added.
> - **Checks (all free/offline):** `npm test` **46/46** ✅ (unchanged — schema is inert) · `npm run
>   typecheck` clean ✅. No live DB this phase (that's Phase 4).
> - **Not committed** — waiting on Carl's QA walk (phase-2.md scenarios). Green light → commit → Phase 3.
> - **Open note carried to Phase 3:** the existing string session id → `sessions.id uuid` mapping (mint
>   uuid + keep folder in `log_dir`, vs. a `legacy_id` column) is decided in Phase 3.

## Parked
- Moving run-history artifacts into the DB — stays on disk this phase, indexed by a `runs` row.
- Invitations as a real feature (resend / sent-at / expires-at flows) — table is scaffolded now; the
  feature is Phase 006+.
- SSO-readiness wiring — the structure is designed in Phase 006; integration is later.
