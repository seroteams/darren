# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.

---

## ▶ Your move

**Phase 005 — Phase 3 (connection pool + repo swap) is ✅ SIGNED OFF (2026-06-28).** You said go. Session
storage now swaps to Postgres (Neon) behind the same interface; committed + pushed. Password rotated.

**Phase 4 (the final piece) is now starting 🔨.** It wires the database restore into server startup so a
real meeting **survives a full server restart** (loaded from Postgres), and adds the short setup docs for
the managed database. When this is approved, Phase 005 is done.

- Last updated: 2026-06-28
- Phase 3 result: `npm test` → **47/47** (incl. the Postgres round-trip; free) ✅ · `npm run typecheck` clean ✅

---

## Active plan: Postgres Foundation (Prototype → Production · Phase 005)

📄 [docs/todo/postgres-foundation/PLAN.md](docs/todo/postgres-foundation/PLAN.md) · phase 1 [phase-1.md](docs/todo/postgres-foundation/phase-1.md)
**Goal:** move the live data — organisations, users, sessions — off loose JSON files into a real Postgres
database, with clear rules and proper versioned migrations. Same behaviour; data now survives a restart.
(Heavy run-history logs stay on disk, indexed by id.)

### The phases
- [x] **Phase 1** — Choose the tool (**Drizzle** locked) + lock the DB rules · ✅
- [x] **Phase 2** — First migration + schema (orgs, users, sessions, runs-index, invitations) · ✅ *signed off*
- [x] **Phase 3** — Connection pool + swap `SessionsRepo` file → Postgres (same interface) · ✅ *signed off*
- [ ] **Phase 4** — Managed-Postgres setup docs + `DATABASE_URL` + the live restart-persistence walk · 🔨 *starting*

> **Gate cleared:** Phase 005 depended on Phase 004's repo seam — that's now signed off, so the build is
> clear the moment you pick the tool. Detailed Phase 2/3/4 step files are written *after* the Phase-1
> decision (same rhythm as 004's D1–D5) because Drizzle and Prisma produce different file layouts.

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (you tested + said go)`
A pass isn't ✅ until **you** walk its QA and green-light it — I never self-certify.
