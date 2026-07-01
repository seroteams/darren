# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

**Admin access guard (Option A) — Phase 1 ✅ done. Phase 2 is ready when you are.**

We're separating the internal admin tooling from the customer flow *without* the big app split (Option A from
the 2026-07-01 revisit). Two phases; **Phase 1 green-lit + committed**. Phase 2 waits on your go.

- **Phase 1 ✅ — require login on the internal tooling.** Every admin-only endpoint (pipeline, checks,
  regression, arcs, lexicon promotion, role-lexicons, suggest-fix, library) now needs a logged-in caller —
  logged out you get a 401 instead of internal data. You walked all 3 scenarios ("all passed").
- **Phase 2 ⬜ — the admin-role wall.** Require an owner/admin *role* (403 for a plain member), hide the admin
  tools in the console from non-admins, and add a member account so we can actually test it.

**👉 Next: say go and I'll start Phase 2** (see [docs/todo/admin-access-guard/phase-2.md](docs/todo/admin-access-guard/phase-2.md)).
One flagged decision waits there: whether Run Review/delete/archive should also go admin-only.

- Last updated: 2026-07-01
- Baseline (free): `npm test` 51/51 · typecheck clean. After Phase 1: **52/52** (+admin-guard unit test) · typecheck clean.
- Plan: [docs/todo/admin-access-guard/PLAN.md](docs/todo/admin-access-guard/PLAN.md).

### Boxes
- [x] **Phase 1 — require login on internal tooling** ✅ green-lit + committed 2026-07-01
  - [x] login-route guard built + unit-tested (anon 401 / logged-in ok / dev side-door ok)
  - [x] wired onto every admin-only route (v1 + legacy) · customer flow untouched
  - [x] `npm test` 52/52 · typecheck clean
  - [x] you walked the 3 scenarios and said go
- [ ] **Phase 2 — admin-role wall + hide the UI** ⬜ not started (say go to start)

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
