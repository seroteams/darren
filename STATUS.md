# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

**Now active: [pre-go-live](docs/pre-go-live/OVERVIEW.md) — the manager's Team & Runs, ratings, and a
superadmin window on the alpha.** 9 phases, one at a time.
**PG1 (Runs list) ✅ · PG2 (Reopen a run) ✅ — 2026-07-01. PG3 (Rate a 1:1) ✅ — 2026-07-03. PG4 (Team —
auto-built) ✅ · PG5 (Person detail) ✅ — signed off + committed 2026-07-04.** The Runs page (now **"Past
1:1s"**) lists your own past 1:1s, each re-openable and rateable (1–5★ + note); the **Team** page builds
itself (one card per person, times met / last met / avg usefulness); clicking a person opens **their page**
— their 1:1s, a **"Since last time"** recap of last meeting's agreed actions + watch-fors, and a one-tap
**"Prep your next 1:1"** that seeds the form (free until you run a pipeline).

**▶ Your move: PG6 (Superadmin gate) — not yet broken down.** Say **"go"** and I'll break PG6 into steps:
your account gains a read-only, cross-company key (proven by tests, no screen yet) — the one intentional
wall-crossing, tightly gated. Nothing built there yet.
Plan: [docs/pre-go-live/006-superadmin-gate/00-phase-overview.md](docs/pre-go-live/006-superadmin-gate/00-phase-overview.md).
Live state: [docs/pre-go-live/PROGRESS.md](docs/pre-go-live/PROGRESS.md). No paid runs.

> 📍 **Checkpoint (say "check point" to come back here).** Saved 2026-07-04 after PG5 sign-off + commit.
> In any fresh session, say **"check point"** and I'll read this file + the PROGRESS log + recent
> commits and give you the full "where we are, your move" picture — no digging needed.

> This track **supersedes** the deferred **member-nav Phase 2** (real Runs) and **009's deferred "real
> Team content"** — both folded in here so trackers don't multiply.

<details><summary>Phase 009 — non-hosting ultra batch (✅ closed 2026-07-01 → done/)</summary>

**Phases 1 · 3 · 4 · 5 · 6 · 7 ✅ done (6 & 7 walked + signed off 2026-07-01). Phase 2 ⏸ parked (→ hosting, later) · Phase 8 ⏸ deferred (→ pre-go-live continuity). Every actionable 009 phase is complete; the folder is archived to `done/`.**

009 turned Sero into something real managers can safely use on real teams, and got the codebase
newcomer-clean. Full plan: [docs/todo/done/009-ready-to-share/](docs/todo/done/009-ready-to-share/PLAN.md).

> **Ultra batch (2026-07-01):** Carl OK'd finishing every remaining non-hosting phase in one run —
> **nothing live, no paid runs.** I build + offline-verify (`npm test`/`typecheck`) + commit each locally.
> Everything I ship is **"built — awaiting your QA"**, never self-certified ✅. You walk the QA scenarios
> (collected per phase below) whenever you're ready. Hosting (Phase 2) stays parked.

- **Phase 1 ✅ — Safety floor (execute 008). Signed off 2026-07-01, committed `e68c4c8c`.** You walked all
  6 QA scenarios (cross-company wall, role limits, key-search zero-hits, DB clean, no-login wall) and gave
  the go. Human expert sign-off **waived for alpha** (accepted risk — keep to 2–3 friendly managers;
  deferred, not cancelled). Build badge: 3/4 of the 008 steps flipped done; the human-expert step stays
  open by design.
- **Phase 4 ✅ — Clear the QA pile (done 2026-07-01).** All 9 built-but-un-QA'd features ticked:
  repo-tidy P1 🟢 · frontend-admin-split P1 🟢 · tracker-consolidation P1 🟢 · member-nav P1 🟢 (fix
  `fc77b8ba`) · stage-data-tabs 🟢 · sent-preview 🟢 · repo-tidy P2 🟢 · todo-board-rebuild P3 🟢 · 
  briefing-grounding-fixes P1 🟢. Nothing half-built left on screen.
- **Phase 2 ⏸ — PARKED (2026-07-01, Carl's call): not hosting yet.** Picks back up when Carl wants a
  shareable URL. The rest of 009 does not depend on it.
- **The ultra batch — progress:**
  - ✅ tidy/audit + member-nav reconcile (committed)
  - ✅ **Phase 3 (privacy + first run)** (`05abd1e0`) — **verified end-to-end 2026-07-01, both roles**
    (member + owner, live): privacy note + consent link, first-run "how it works" on member Home, real
    Team/Runs empty states (no "Coming soon"), register landing fix. Walk it anytime — nothing self-certified blind.
  - ✅ **Phase 5 (feedback + one-pager)** (`92aff101`) — **verified end-to-end** (test-first backend):
    feedback note reaches `content/data/feedback/feedback.jsonl` (destination verified), empty → 400,
    logged-out → 401; About one-pager + both in the nav footer. Feedback file is git-ignored.
  - ✅ **Phase 6 (repo-tidy 3–4 + hermetic tests)** — `sessions.controller` split 698→134 (`b51aec29`),
    `npm test` hermetic (`c66a455a`), admin TS pilot (`70e0f339`). Walked + signed off 2026-07-01.
  - ✅ **Phase 7 (docs + newcomer README)** — tracker-consolidation + README two-source clarity (`0f5f6677`).
  - ⏸ **Phase 8 (continuity / "remembering") — deferred**, folded into the pre-go-live track.
- **Baseline (free, 2026-07-01):** `npm test` **52/52** · `npm run typecheck` clean. Paid gate needs your go-ahead.

</details>

**Member navigation — Phase 1 ✅ (committed + signed off).** Corrected 2026-07-01: this was already
committed (`d864a3a3` + landing fix `fc77b8ba`) and QA-ticked (`1aea2b1b`) — the earlier "built,
uncommitted" note was stale. Member rail = Home · Team · Runs, members land on a clean Home, admins
untouched, dev Admin/Standard quick-swap works. Phase 2 (Real Runs) has backend groundwork landed
(`ca23831e`/`9a2a7148`/`f30783d9`) but the Runs *page* is still the placeholder — that's the genuinely
open member-nav work. Plan: [docs/todo/member-nav/](docs/todo/member-nav/PLAN.md).

- Last updated: 2026-07-04

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
| [repo-tidy](docs/todo/repo-tidy/PLAN.md) | ✅ done (all 4 phases; 3–4 via 009 P6) |
| [tracker-consolidation](docs/todo/tracker-consolidation/PLAN.md) | ✅ done (all 4 phases; 2–4 via 009 P7) |
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
