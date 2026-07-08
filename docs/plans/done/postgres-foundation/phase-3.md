# Phase 3 — Connection pool + repo swap (file → Postgres)

**Part of:** [PLAN.md](plan.md) · **Tool:** Drizzle (locked) · **Status:** ⬜

## Goal
Add the database connection and swap the **sessions** (and a small **users**) storage from JSON files to
Postgres — **behind the exact same repo interface** Phase 004 built, so the services don't change a line.
"Same interface, different storage."

## What you'll have when it's done
- `backend/db/client.ts` — a connection pool (`pg`) + the Drizzle instance, reading `DATABASE_URL`.
- `backend/api/services/sessions/sessions.repo.ts` gains a **`pgSessionsRepo`** that implements the same
  `SessionsRepo` interface as `fileSessionsRepo` (the session record read/create/drop/persist moves to
  Postgres; the log-only disk writes — eligibility/amend/notes — stay as files, indexed by `log_dir`).
- A small **`UsersRepo`** (new) with a `pgUsersRepo` — enough to create/read a user + its org. (No login;
  Phase 006 adds auth on top.)
- A wiring switch: pick `pgSessionsRepo` when `DATABASE_URL` is set, else fall back to `fileSessionsRepo`
  — so the app still runs with no DB.
- Tests: a repo round-trip test (create → read → persist → re-read) proving the Postgres repo satisfies
  the interface. `npm test` stays green.

## How we keep it honest (the seam, not a rewrite)
- The `SessionsRepo` interface is the contract; **only the implementation changes**. The services
  (`sessions.service.ts`) and controllers are **not touched** — that is the whole point of Phase 004's
  seam and how we prove it in the QA walk.
- The full session object serializes into the `sessions.state` **jsonb** column (it already serializes to
  a JSON file today — same shape, new home).
- The on-disk run artifacts (`inputs.json`, transcripts, …) **stay on disk**; a `runs` row indexes them
  by `log_dir`. No engine / `reviewrun` / gate path changes.

## The session-id decision (flagged in Phase 2, resolved here)
Resolve how the existing string session id maps to `sessions.id uuid`: either mint a uuid per session and
keep the on-disk folder in `log_dir`, or keep the existing id in a `legacy_id text` column. Pick the
simpler one that keeps the on-disk logs findable, write it down in PLAN.md's Current state, and adjust the
schema with a follow-up migration (`db:generate`) if needed.

## Not in this phase
- `docker-compose` / standing up local Postgres / the README (Phase 4) — but Phase 3 **needs** a reachable
  Postgres to run its round-trip test. Options: (a) bring Phase 4's `docker-compose` forward just enough
  to have a DB to test against, or (b) test against a throwaway local/CI Postgres. Decide at the top of
  Phase 3 and note it; the full one-command setup + docs still land in Phase 4.
- Auth / login (Phase 006).
- Moving run artifacts into the DB (parked).

## Done when
- [ ] `pgSessionsRepo` implements `SessionsRepo` with no change to `sessions.service.ts`.
- [ ] A round-trip test creates a session via the Postgres repo, reads it back, persists a change, and
      re-reads it — green.
- [ ] With `DATABASE_URL` unset the app still runs file-backed (no regression); with it set, sessions go
      to Postgres.
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Same interface** — I show you `sessions.service.ts` is unchanged between Phase 002-era and now; only
   the repo implementation differs. You should be able to say "same interface, different storage."
2. **Round-trip proof** — the new test creates and reloads a session from Postgres and passes.
3. **Still runs without a DB** — with `DATABASE_URL` unset, the app behaves exactly as today (file-backed).
4. **Logs still on disk** — a run still writes its artifacts to `logs/…`; the `runs`/`sessions` row points
   at them. ❌ Not OK if any artifact silently moved into the DB.

→ **Green light** = I commit Phase 3 (local) and start **Phase 4** (docker-compose + `DATABASE_URL` + docs
+ the restart-persistence walk).
