# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

**Now active: Phase 009 — Getting ready to share (real-data alpha). Phase 1 ✅ done · Phase 2 ⬜ next.**

009 turns Sero into something real managers can safely use on real teams, and gets the codebase
newcomer-clean. 8 phases, ship-blockers first. Full plan: [docs/todo/009-ready-to-share/](docs/todo/009-ready-to-share/PLAN.md).

- **Phase 1 ✅ — Safety floor (execute 008). Signed off 2026-07-01, committed `e68c4c8c`.** You walked all
  6 QA scenarios (cross-company wall, role limits, key-search zero-hits, DB clean, no-login wall) and gave
  the go. Human expert sign-off **waived for alpha** (accepted risk — keep to 2–3 friendly managers;
  deferred, not cancelled). Build badge: 3/4 of the 008 steps flipped done; the human-expert step stays
  open by design.
- **Phase 2 ⬜ — Hosted + spend-capped (next, not started).** A shareable URL an invited manager can reach,
  a usage/cost cap, and graceful failure. **Awaiting your start** — or you may prefer to jump to the queued
  QA-pile clear-out; your call.
- **Baseline (free, 2026-07-01):** `npm test` **52/52** · `npm run typecheck` clean. Paid gate needs your go-ahead.

**Also waiting on your QA (separate plan): Member navigation — Phase 1 built. 🔨**
Member rail cut to Home · Team · Runs; members land on a Home page with "Start a new session"; Team/Runs are
placeholders; admins untouched. **Test via the quick-swap:** log in as **Standard** → see only Home · Team ·
Runs, land on Home, start a session; Team/Runs show placeholders; admin login unchanged. Plan:
[docs/todo/member-nav/](docs/todo/member-nav/PLAN.md). (Built, uncommitted, awaiting your green light.)

- Last updated: 2026-07-01

---

### Just finished: Admin access guard (Option A) ✅ (closed)
Internal tooling login-gated (Phase 1 `370033b5`) + admin-role-gated (Phase 2, 2026-07-01) + dev Admin/Standard
quick-swap (`53dbd0ae`). Member refused the tooling (403), owners unaffected. Archived at
[docs/todo/done/admin-access-guard/](docs/todo/done/admin-access-guard/PLAN.md). Parked: Option B (`/api/admin/*`
prefix), Option C (separate customer `frontend/`), roles-management UI.

---

### Just finished: Auth hardening ✅ (closed)
Both post-007 holes shut, tested, committed. Phase 1 (live sessions fenced by company, `12fc3071`) · Phase 2
(runs endpoints require login, session *start* stays open by your call). Archived at
[docs/todo/done/auth-hardening/](docs/todo/done/auth-hardening/PLAN.md). Prior: Phase 007 login screen ✅
([docs/todo/done/login-screen/](docs/todo/done/login-screen/PLAN.md)).

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
