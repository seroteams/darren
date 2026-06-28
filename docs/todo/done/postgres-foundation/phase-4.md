# Phase 4 — Boot-restore + setup docs + the persistence walk

**Part of:** [PLAN.md](PLAN.md) · **Tool:** Drizzle (locked) · **DB:** managed Postgres (Neon) · **Status:** 🔨

> **Note:** Phase 4 was originally "docker-compose for local Postgres." Carl chose a **managed cloud
> Postgres (Neon)** instead — nothing to install. So this phase is the **setup docs for the managed DB**
> plus wiring the **boot-restore** in, and proving the headline: a session survives a server restart.

## Goal
Make the database easy for a teammate to set up (documented), and prove the promise: **start the app,
create a session, restart the server, and it's still there — loaded from Postgres.**

## What you'll have when it's done
- **Boot-restore wired in:** on server start, when `DATABASE_URL` is set, live sessions are reloaded from
  Postgres (`loadSessionsFromDb`, called from `startSweep`) — so a session survives a restart.
- **Setup docs** (`backend/db/README.md`): the exact steps a teammate follows cold — create a free managed
  Postgres, put `DATABASE_URL` in `.env`, run `npm run db:migrate`, run the app.
- `.env.example` documents `DATABASE_URL` (done in Phase 2/3).
- The build-from-clean path verified: from no tables, `npm run db:migrate` creates all 5.

## Done when
- [ ] `npm run db:migrate` builds all 5 tables from clean against the managed DB.
- [ ] **The restart walk passes:** start the app, create a session, **restart the server**, and the session
      is restored **from Postgres** (the log shows `restored N session(s) from Postgres`).
- [ ] `backend/db/README.md` steps work followed verbatim (a teammate could do it cold).
- [ ] `npm test` green (incl. the boot-restore assertion in the round-trip test); `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Automated restart proof (free)** — run `node backend/tests/sessions/test-pg-roundtrip.js`. The last
   check, *"boot-restore loads the session from Postgres into the live map,"* is the restart path proven in
   code. ❌ Not OK if it fails or is skipped (skip = no `DATABASE_URL`).
2. **The live restart walk** — `npm run dev`, create a session in the app (start a 1:1), then **stop and
   restart the server**. Reopen the session — it's still there, and the server log says
   `restored N session(s) from Postgres`. *(Creating the session can use the offline path — no paid run
   needed. A live engine run is only needed if you want a fully-populated briefing, and that needs your
   explicit yes + a cost first.)*
3. **Read the README** — `backend/db/README.md` matches what you'd actually do; nothing undocumented.
4. **Describe the swap** — you can say it in your own words: "same interface, different storage — a session
   moved from a JSON file to a Postgres row; the heavy logs stayed on disk."

→ **Green light** = Phase 005 is ✅. I close it out: PLAN.md phases all ✅, move the folder to
`docs/todo/done/`, set `PROGRESS.md` Phase 005 → `done`, update the build-plan badge + `STATUS.md`, and roll
STATUS.md to the next active plan (Phase 006 — Auth).

## A note on cost
Phase 005 is **all free/offline** — the database runs in the cloud free tier; nothing here hits the OpenAI
API. The restart walk uses a real pipeline run **only if** you want to populate a session via the live
engine — that single run is the one paid step, and it needs your explicit yes + a stated cost first.
