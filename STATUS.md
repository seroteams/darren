# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.

---

## ▶ Your move

**🎉 Phase 006 (Auth — "The front door") is COMPLETE — all 4 steps built, tested, and committed.**
You can register, log in, stay logged in, get turned away when logged out, log out for real, and your
private skip-the-password switch can never leak to customers. Signup now creates the company (you're its
owner) and each company's data is walled off from every other. I ran all the checks for you — every one
green. Closed out to [docs/todo/done/auth-front-door/](docs/todo/done/auth-front-door/PLAN.md).

**One honest note for later:** there's still **no login *screen*** — the admin console you open at
localhost:3000 doesn't ask you to log in yet. Wiring login into the actual UI (and pointing the existing
screens at your real company instead of the shared pre-auth placeholder) is the next body of work — call it
**Phase 7: the login screen**. The back-end front door is done; the visible door is next.

**Pick what's next** (no rush):
- **Phase 7 — the login screen** (make the login real in the app you can click).
- **Planner grounding** (engine track) — scaffolded at [docs/todo/planner-grounding/PLAN.md](docs/todo/planner-grounding/PLAN.md), still awaiting your scope pick (A/B/C/all).

- Last updated: 2026-06-29
- Phase 006 final: `npm test` → **49/49** ✅ · typecheck clean ✅ · live-proved against Postgres (login flow + two-company isolation). Committed across `2e43a42e` → (Phase 4 commit).

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
