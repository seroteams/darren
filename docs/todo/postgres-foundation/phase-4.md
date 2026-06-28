# Phase 4 — docker-compose + `DATABASE_URL` + docs (the persistence walk)

**Part of:** [PLAN.md](PLAN.md) · **Tool:** Drizzle (locked) · **Status:** ⬜

## Goal
Make the database **one command to stand up locally**, document it so a teammate can follow it cold, and
prove the headline promise: **create a session, restart the server, and it's still there — loaded from
Postgres.**

## What you'll have when it's done
- `docker-compose.yml` — a local Postgres service (named volume so data survives a container restart),
  with the version + credentials pinned.
- `.env.example` — a documented `DATABASE_URL` (and a note that with it unset the app stays file-backed).
- A short **README section** (`backend/db/README.md` or the root README): the exact commands —
  `docker compose up -d` → `npm run db:migrate` → `npm run dev` — that build the DB from clean and run the
  app against it.
- The full **build-from-clean** path verified: from no database, one command brings Postgres up and
  `db:migrate` creates all 5 tables.

## Done when
- [ ] `docker compose up -d` starts Postgres locally; `npm run db:migrate` builds all 5 tables from clean.
- [ ] **The persistence walk passes:** start the app, create a session, **restart the server**, and the
      session is restored **from the database** (not from a file).
- [ ] The README commands work followed verbatim (a teammate could do it cold).
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **One command up** — run `docker compose up -d` then `npm run db:migrate`. You should see Postgres
   start and the migration create the 5 tables, no hand-editing. ❌ Not OK if it needs manual SQL.
2. **The restart walk** — with the DB up: start the app, run a real 1:1 far enough to create a session,
   **stop and restart the server**, reopen — the session is still there, loaded from Postgres. This is the
   whole point of Phase 005.
3. **Read the README** — the documented commands match what you actually ran; nothing undocumented was
   needed.
4. **Describe the swap** — you can say in your own words: "same interface, different storage — the session
   moved from a JSON file to a Postgres row; the heavy logs stayed on disk."

→ **Green light** = Phase 005 is ✅. I close it out: PLAN.md phases all ✅, move the folder to
`docs/todo/done/`, set `docs/prototype-to-production/PROGRESS.md` Phase 005 → `done`, update the build-plan
badge + `STATUS.md`, and roll STATUS.md to the next active plan (Phase 006 — Auth).

## A note on cost
Phase 005 is **all free/offline** — Postgres runs locally in Docker; nothing here hits the OpenAI API. The
restart walk uses a real pipeline run **only if you want to populate a session via the live engine** — that
single run is the one paid step, and it needs your explicit yes + a stated cost first. A session can also
be created with the offline/fixtures path to prove persistence without any spend.
