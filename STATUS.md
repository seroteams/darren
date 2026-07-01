# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

**Auth hardening — DONE and closed ✅. Nothing is actively in flight — pick what's next.**

Both holes the post-007 health check found are now shut, tested, and committed:

- **Phase 1 — live sessions fenced by company.** One company can't read or write another's live session (404).
- **Phase 2 — runs endpoints require login.** Logged-out callers get 401 instead of the legacy unfenced list.
  Session *start* stays open to logged-out visitors, by your call.

Plan archived at [docs/todo/done/auth-hardening/](docs/todo/done/auth-hardening/PLAN.md). When you want the next
thing, tell me which — a parked plan below, or an item from [SERO_BOARD.md](SERO_BOARD.md) (the "Cross-session
follow-up" continuity loop is the flagged next big item).

- Last updated: 2026-07-01
- Phase 1: ✅ committed `12fc3071` · 51/51 + live 2-company wall smoke 8/8.
- Phase 2: ✅ committed with close-out · 51/51 + live runs-gate smoke 5/5 (anon 401, logged-in 200, dev
  side-door 200, anon start 201). Side-door off + no OpenAI key → both smokes free.
- Earlier this session: health check (typecheck clean · build clean · 0 dep vulns · paid 2-case gate **PASS**,
  ~$0.70) + fixed a stale smoke-test check that was blocking the gate/smoke harness (`0331cfa0`).
- Prior plan (Phase 007 login screen): ✅ closed at [docs/todo/done/login-screen/](docs/todo/done/login-screen/PLAN.md).

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
