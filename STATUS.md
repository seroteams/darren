# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.

---

## ▶ Your move

**Phase 005 — Phase 2 (first migration + schema) is BUILT and waiting for your QA walk.** 🔨
The 5 tables — `organizations`, `users`, `sessions`, `runs`, `invitations` — are defined in plain
TypeScript (`backend/db/schema.ts`) and Drizzle generated a readable versioned SQL migration from them
(`backend/db/migrations/0000_glorious_sunset_bain.sql`). `npm run db:generate` / `db:migrate` scripts added.
**Nothing was committed** — that waits for your green light (Darren rhythm).

**To walk it (all free, offline — no DB, no OpenAI):** follow the 4 scenarios in
[docs/todo/postgres-foundation/phase-2.md](docs/todo/postgres-foundation/phase-2.md) — read the schema, read
the generated SQL, confirm nothing else moved, confirm the run-logs still stay on disk. Say **go** and I
commit Phase 2 and start Phase 3 (the repo swap).

- Last updated: 2026-06-28
- Baseline before Phase 2: `npm test` → **46/46 passed** (free, offline) ✅
- After Phase 2 build: `npm test` → **46/46** ✅ · `npm run typecheck` clean · migration generates the 5 tables ✅

---

## Active plan: Postgres Foundation (Prototype → Production · Phase 005)

📄 [docs/todo/postgres-foundation/PLAN.md](docs/todo/postgres-foundation/PLAN.md) · phase 1 [phase-1.md](docs/todo/postgres-foundation/phase-1.md)
**Goal:** move the live data — organisations, users, sessions — off loose JSON files into a real Postgres
database, with clear rules and proper versioned migrations. Same behaviour; data now survives a restart.
(Heavy run-history logs stay on disk, indexed by id.)

### The phases
- [x] **Phase 1** — Choose the tool (**Drizzle** locked) + lock the DB rules · ✅
- [ ] **Phase 2** — First migration + schema (orgs, users, sessions, runs-index, invitations) · 🔨 *built — awaiting your QA*
- [ ] **Phase 3** — Connection pool + swap `SessionsRepo`/`UsersRepo` file → Postgres (same interface) · ⬜
- [ ] **Phase 4** — `docker-compose` + `DATABASE_URL` + docs (restart-persistence walk) · ⬜

> **Gate cleared:** Phase 005 depended on Phase 004's repo seam — that's now signed off, so the build is
> clear the moment you pick the tool. Detailed Phase 2/3/4 step files are written *after* the Phase-1
> decision (same rhythm as 004's D1–D5) because Drizzle and Prisma produce different file layouts.

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (you tested + said go)`
A pass isn't ✅ until **you** walk its QA and green-light it — I never self-certify.
