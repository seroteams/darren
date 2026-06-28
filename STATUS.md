# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.

---

## ▶ Your move

**Phase 004 (Backend API v1) is ✅ DONE & SIGNED OFF (2026-06-28)** — you owner-walked it and approved. The
whole backend is now clean layers (controller → service → repo) under `/api/v1/`, file-backed behind a
**swappable repo seam**. Closed out: badge → ✅ Built, folder archived to `docs/todo/done/backend-api-v1/`,
PROGRESS.md → done. *(No paid run was needed — the $3 budget is untouched.)*

**Phase 005 (Postgres foundation) is now active. Tool decided: ✅ Drizzle.** A **handover is written for a
fresh thread** to continue the build — see
[docs/todo/postgres-foundation/HANDOVER.md](docs/todo/postgres-foundation/HANDOVER.md).

**To continue:** open a new thread and paste the quick-start prompt at the bottom of that handover (or use
the `/tasks` board's one-click "Copy continue prompt" for Phase 005). The new thread will write the
detailed Phase 2/3/4 step files in Drizzle's shape, run the free baseline (`npm test`), then build
**Phase 2 — the first migration** (the 5 tables). One phase at a time; you green-light before the next.

- Last updated: 2026-06-28
- Baseline at 004 sign-off: `npm test` → **46/46 passed** (free, offline) ✅ · typecheck clean

---

## Active plan: Postgres Foundation (Prototype → Production · Phase 005)

📄 [docs/todo/postgres-foundation/PLAN.md](docs/todo/postgres-foundation/PLAN.md) · phase 1 [phase-1.md](docs/todo/postgres-foundation/phase-1.md)
**Goal:** move the live data — organisations, users, sessions — off loose JSON files into a real Postgres
database, with clear rules and proper versioned migrations. Same behaviour; data now survives a restart.
(Heavy run-history logs stay on disk, indexed by id.)

### The phases
- [ ] **Phase 1** — Choose the tool (**Drizzle vs Prisma**) + lock the DB rules · ⬜ *awaiting your pick*
- [ ] **Phase 2** — First migration + schema (orgs, users, sessions, runs-index, invitations) · ⬜ *detail written after the pick*
- [ ] **Phase 3** — Connection pool + swap `SessionsRepo`/`UsersRepo` file → Postgres (same interface) · ⬜
- [ ] **Phase 4** — `docker-compose` + `DATABASE_URL` + docs (restart-persistence walk) · ⬜

> **Gate cleared:** Phase 005 depended on Phase 004's repo seam — that's now signed off, so the build is
> clear the moment you pick the tool. Detailed Phase 2/3/4 step files are written *after* the Phase-1
> decision (same rhythm as 004's D1–D5) because Drizzle and Prisma produce different file layouts.

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (you tested + said go)`
A pass isn't ✅ until **you** walk its QA and green-light it — I never self-certify.
