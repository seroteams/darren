# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

**Phase 007 — the login screen — is DONE and closed ✅. Nothing is actively in flight — pick what's next.**

Both phases are green-lit and committed locally. The admin console now has a real front door (login / register /
logout), and each company sees only its **own** runs — two companies can't see each other's data. The plan is
archived at [docs/todo/done/login-screen/](docs/todo/done/login-screen/PLAN.md).

There's no phase plan in flight right now. When you want to start the next thing, tell me which — either a
parked plan below, or a feature from [SERO_BOARD.md](SERO_BOARD.md) (the "Cross-session follow-up" continuity
loop is the flagged next big item). I'll set it up as a fresh plan and we work it one phase at a time.

One small loose thread carried over: a hardening follow-up to also fence *live, in-progress* sessions by
company (the saved-runs wall is complete). Low priority, parked in the closed plan and on the board.

- Last updated: 2026-06-29
- Phase 1 (login gate + screens): ✅ committed `b8db668a` · QA-walked by you.
- Phase 2 (data fenced per company, approach A): ✅ committed `6df05419` · `npm test` **51/51**, typecheck clean,
  + a live free smoke (logged-in fenced runs = 0, anonymous legacy = 3 — the wall live over HTTP). Paid
  two-company walk deferred; you accepted on the offline tests + smoke.
- App may still be running for you at http://localhost:3000 (a fresh API on 3007 + web on 3000 I started for the
  smoke; the pre-existing 3001 server was left untouched).

---

## Parked / backlog plans (NOT in-flight)

Nothing below is actively being worked. They're scaffolded ideas in `docs/todo/`,
waiting for a scope pick or a turn. Listed here so the folder count never *looks*
like 8 things are half-done at once — they aren't.

| Plan | State |
|---|---|
| [planner-grounding](docs/todo/planner-grounding/PLAN.md) | parked — awaiting scope pick (A/B/C/all) |
| [briefing-readability-p0](docs/todo/briefing-readability-p0/PLAN.md) | parked |
| [briefing-grounding-fixes](docs/todo/briefing-grounding-fixes/PLAN.md) | awaiting |
| [see-before-sent](docs/todo/see-before-sent/PLAN.md) | awaiting |
| [sent-preview](docs/todo/sent-preview/PLAN.md) | awaiting |
| [stage-data-tabs](docs/todo/stage-data-tabs/PLAN.md) | awaiting |
| [repo-tidy](docs/todo/repo-tidy/PLAN.md) | awaiting |
| [todo-board-rebuild](docs/todo/todo-board-rebuild/PLAN.md) | awaiting |

When one becomes live, move it up into "Your move" above and start its phases.

---

## Just-finished plan: Phase 006 — The front door (Auth) ✅

📄 [docs/todo/done/auth-front-door/PLAN.md](docs/todo/done/auth-front-door/PLAN.md)
**Goal:** real register/login with safe passwords, guarded pages, signup that creates the company (data
fenced per-company) — plus a dev-only one-click login that's sealed shut for real customers. **All delivered.**

| # | Phase | Status |
|---|---|---|
| 1 | Accounts tables ready | ✅ committed `2e43a42e` |
| 2 | Register & login with safe passwords | ✅ committed `d1a6b8c6` |
| 3 | Keep people in, guard the doors (+ dev side-door) | ✅ committed `c303f136` |
| 4 | Signup creates the company | ✅ committed |

**Before that:** Postgres Foundation → [docs/todo/done/postgres-foundation/PLAN.md](docs/todo/done/postgres-foundation/PLAN.md) (all 4 phases ✅, committed `b079b88b`).

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (tested + green-lit)`
A pass isn't ✅ until its QA is walked and green-lit — I never self-certify.
