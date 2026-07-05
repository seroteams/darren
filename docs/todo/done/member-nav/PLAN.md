# Member navigation — cut the rail down to Home · Team · Runs

**Goal:** A plain member sees a small, member-shaped app — Home, Team, Runs — instead of being dropped straight into the New-session flow with a one-item rail. Admins are untouched.
**Driver:** Carl
**Created:** 2026-07-01

## Background (why this isn't just a filter)
Today the nav already hides every admin tool from a member — a member only ever sees **New session** ([app-nav.js](../../../admin/src/ui/app-nav.js)), and on login is pushed straight into the prep flow ([main.js](../../../admin/src/main.js) boot). The full tool list in Carl's screenshot is the **admin** view.

So "Home, Team, Runs" is a *new member experience*, not a smaller filter:
- **Home** — a member landing page (doesn't exist yet; members skip it).
- **Team** — brand-new concept. Placeholder page for now (Carl's call).
- **Runs** — the member's **own** past runs. Runs are currently fenced by company (`orgId`) only, with no per-user attribution, and every runs endpoint is admin-only ([runs.controller.ts](../../../backend/api/services/runs/runs.controller.ts)). Real backend work.

## Done means
- Log in as a member → land on a **Home** page, with a rail of exactly **Home · Team · Runs** (+ Log out).
- **Team** opens a friendly placeholder page.
- **Runs** opens the member's own finished runs — and never shows another member's or an admin's runs.
- Admin login is completely unchanged (full rail, lands on the admin Home).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Member shell | Member rail = Home · Team · Runs; member lands on Home; Team + Runs are placeholder pages; deep-link guards updated | ✅ |
| 2 | Real Runs | Attribute runs to the member, member-safe own-runs endpoint, Runs page shows the real list | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ ticked 2026-07-01** (QA-pile clear-out, walked live in the browser). All 7 scenarios pass.
**QA caught a real gap the earlier "verified" note missed:** the login-click path landed a member on the
admin/testing start page (persona bench + "Replay test run"), not their Home — the boot/reload path was
correct, but `login.js` sent everyone to `START`. **Fixed** `fc77b8ba`: non-admins route to `MEMBER_HOME`
on login (admin unchanged), re-verified in-browser. Phase 2 (real Runs) not started.

Files touched (Phase 1, all frontend):
- `admin/src/state.js` — new stages MEMBER_HOME, TEAM, RUNS.
- `admin/src/ui/app-nav.js` — role-based rail; member links Home · Team · Runs; Team/Runs icons.
- `admin/src/stages/member-home.js`, `team.js`, `runs.js` — new pages (member Home + two placeholders).
- `admin/src/main.js` — register stages; members land on Home + honor member deep links; back/forward bounce → Home.
- `admin/src/router.js` — `/home` `/team` `/runs` paths + `isMemberStage` helper.
- `admin/src/styles/design.css` — **bug fix**: `.app-nav__link[hidden]{display:none}`. The base `.app-nav__link{display:flex}` was overriding the `[hidden]` attribute, so role-hiding never actually hid anything visually (the admin-access-guard Phase 2 UI hide silently never worked — only the API 403 did). This is why Carl saw the full rail on the manager login. Plus a `.app-nav--member` theme: **Sero blue `#5AA9E6`** rail with **`#24445C`** icons + text, so the manager app is visually distinct from the dark-navy admin rail (`app-nav.js` toggles the class by role).

Verified live in the preview (dev quick-swap both roles): **manager** rail = Home · Team · Runs (+ Log out), lands on `/home`; **admin** rail = full toolset unchanged, member items stay hidden.

## Parked
- Real **Team** content (teammates / their briefings / shared prep) — placeholder ships first, define later.
- What a member sees when they **open** one of their runs — Phase 2 opens a simple read-only briefing view; richer member debrief is a follow-up.
- Member **Home** polish (recent activity, tips, empty states) — start minimal.
- Backfilling **existing** runs with a member owner — pre-Phase-2 runs have no user attribution, so they simply won't appear in a member's list. Decide later if that matters.

---

## CLOSED 2026-07-05 (live-data-cleanup Phase 4, Carl's call)
Phase 1 (member rail) was signed off 2026-07-01. Phase 2 ("real Runs") was
**superseded by the pre-go-live track** — PG1–PG5 delivered the real Past 1:1s
list, reopen + rate, the auto-built Team, and per-person pages. Nothing here
is still open.
