# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

**Phase 007 — Phase 1 (login gate + screens) is DONE and committed ✅. Next: Phase 2 — re-point the data.**

You walked Phase 1 and gave the go ("logged in and out and work swell"), so it's committed locally and the
build board's 007 entry is re-framed to the fold-in (no more "separate customer app"). The admin console now
has a real front door — login screen when logged out, register creates your account + company, refresh keeps
you in, log out returns you to login.

**Phase 2 — the data re-point (real isolation):** make the console read/write **your** company's data, not
the shared placeholder org, so two companies can't see each other's runs. My first move is read-only and free:
verify the generic `/api/v1/` routes already fence by your login's company (the way `/auth/me/runs` does). If
any still fall back to the shared org, that's a small backend fix I'll flag first — not paper over. Then I
migrate the client off the legacy routes. Full detail: [docs/todo/login-screen/phase-2.md](docs/todo/login-screen/phase-2.md).

- Last updated: 2026-06-29
- Phase 1: committed locally ✅ · `npm test` **49/49** ✅ · typecheck clean ✅ · your QA walk green ✅.
- Phase 2: **built — ready for your QA walk** (uncommitted; commits on your green light). Approach A. Runs are
  fenced by company end-to-end, new sessions are stamped with your company, and the console's screens now read
  from the fenced routes. Offline checks green: `npm test` **51/51**, typecheck clean, client syntax OK.
  Deferred as a follow-up (task #7): live-session-by-id hardening — not needed for the runs QA.
  Live free smoke (no paid runs) confirms the wall over real HTTP: logged in, fenced `/api/v1/runs/recent`
  returns **0** (old null-org runs hidden); anonymous legacy path returns **3** — the fence working.
  **App is running for you at http://localhost:3000** (fresh API on 3007, today's code; existing 3001 left alone).
  **▶ Your move:** walk the two-company isolation scenarios in [phase-2.md](docs/todo/login-screen/phase-2.md).
  Heads-up: making a run appear means starting a session, which calls the AI model (small paid OpenAI usage) —
  your call to run. One behaviour note: old dev runs (no company tag) won't show under your account, by design.

---

## Active plan: Phase 007 — The login screen (fold into the admin console)

📄 [docs/todo/login-screen/PLAN.md](docs/todo/login-screen/PLAN.md)
**Goal:** make login real in the app you can click, then point the console's data at your real company so
two companies can't see each other's runs.

| # | Phase | Status |
|---|-------|--------|
| 1 | Login gate + screens | ✅ done — green-lit + committed |
| 2 | Re-point console data to the org (real isolation) | 🔨 in progress — approach A chosen, building |

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
