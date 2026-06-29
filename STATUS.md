# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.

---

## ▶ Your move

**Phase 1 (Accounts tables ready) is built — please walk the 2 QA scenarios and say go.** I added the
`auth_sessions` login-pass table, generated + applied its migration (confirmed live in your Postgres),
and installed `bcryptjs` ready for Phase 2. `npm test` 47/47 ✅, typecheck clean ✅. **Not committed yet** —
I commit the moment you green-light. Your two checks are in [phase-1.md](docs/todo/auth-front-door/phase-1.md#test-scenarios--for-the-product-owner):

1. **Tables build from clean** — fresh DB + `npm run db:migrate` finishes with no errors; `auth_sessions` shows up.
2. **Nothing else broke** — `npm test` still shows 47/47.

📄 Plan: [PLAN.md](docs/todo/auth-front-door/PLAN.md) ·
[phase-1](docs/todo/auth-front-door/phase-1.md) · [phase-2](docs/todo/auth-front-door/phase-2.md) ·
[phase-3](docs/todo/auth-front-door/phase-3.md) · [phase-4](docs/todo/auth-front-door/phase-4.md)

**Parked / queued:**
- **Planner grounding** (engine track) — still scaffolded at [docs/todo/planner-grounding/PLAN.md](docs/todo/planner-grounding/PLAN.md), awaiting your scope pick (A/B/C/all). Paused while we do auth; pick it back up after.
- A regression test for the live DB-wiring path (Phase 005 follow-up) — spun off as a background task.

- Last updated: 2026-06-28
- Phase 005 final: `npm test` → **47/47** ✅ · typecheck clean ✅ · live DB path verified (real run in Postgres). Committed `b079b88b`, pushed.

---

## Active plan: Phase 006 — The front door (Auth)

📄 [docs/todo/auth-front-door/PLAN.md](docs/todo/auth-front-door/PLAN.md)
**Goal:** real register/login with safe passwords, guarded pages, signup that creates the company (data
fenced per-company) — plus a dev-only one-click login that's sealed shut for real customers.
**Status:** Phase 1 built 2026-06-29, **awaiting Carl's QA + green light** (not committed yet).

| # | Phase | Status |
|---|---|---|
| 1 | Accounts tables ready | 🔨 built — awaiting your QA |
| 2 | Register & login with safe passwords | ⬜ |
| 3 | Keep people in, guard the doors (+ dev side-door) | ⬜ |
| 4 | Signup creates the company | ⬜ |

**Just-finished plan:** Postgres Foundation → [docs/todo/done/postgres-foundation/PLAN.md](docs/todo/done/postgres-foundation/PLAN.md) (all 4 phases ✅, committed `b079b88b`).

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (you tested + said go)`
A pass isn't ✅ until **you** walk its QA and green-light it — I never self-certify.
