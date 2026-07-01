# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

**Auth hardening — Phase 1 ✅ done & committed. I'm now building Phase 2 (the login-required door).**

📄 [docs/todo/auth-hardening/PLAN.md](docs/todo/auth-hardening/PLAN.md)

A health check (after Phase 007 closed) found two access-control holes. This plan closes them, one phase at a time:

- **Phase 1 — Fence live sessions by company. ✅ done.** One company can no longer read or write another's live
  session — it gets a 404 every time. Tested offline (51/51) + a free live 2-company HTTP smoke (8/8). Committed.
- **Phase 2 — Guard the doors. 🔨 in progress.** Today a request with no login isn't denied — it falls through
  to the legacy *unfenced* view. Phase 2 refuses anonymous callers (401) on the protected runs + session
  endpoints. One open call to confirm: keep session *start* open to logged-out visitors (recommended).

When Phase 2 is built I'll hand you its scenarios to QA before we close the plan out.

- Last updated: 2026-07-01
- Phase 1: ✅ committed · offline 51/51 + live 2-company wall smoke 8/8 (side-door off, no OpenAI key → free).
- Health check earlier this session: typecheck clean · build clean · 0 dep vulns · paid 2-case gate **PASS**
  (happy + honesty sentinel, ~$0.70). Fixed a stale smoke-test check that was blocking the gate/smoke harness —
  committed `0331cfa0`.
- Prior plan (Phase 007 login screen): ✅ closed, archived at [docs/todo/done/login-screen/](docs/todo/done/login-screen/PLAN.md).

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
