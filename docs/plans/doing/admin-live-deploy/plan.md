# Live Admin — ship the admin console to the live site + founder pulse dashboard

**Goal:** Carl logs in at `seroteams live /admin` with carl@seroteams.com (phone or laptop) and sees the live site's real life: managers, their teams, runs with types, answers, feedback, guests, drop-offs, errors.
**Driver:** Carl
**Created:** Sat 12 Jul 2026

## Done means
- On his phone, Carl opens `https://sero-obwq.onrender.com/admin`, logs in, and lands on a Pulse screen showing the Gate-1 number ("came back unprompted: N of M") with live data.
- Clicking a manager shows their team and every run (with meeting type); clicking a run shows the answers typed and the feedback left.
- The customer app at `/` is untouched; local dev is unchanged; the Test engine cannot spend money on live.

## Resolved before we start
- Superadmin gating already exists end-to-end: `SUPERADMIN_EMAILS` allowlist (require-auth.ts), `requireSuperadminRoute` on every `/api/v1/admin/*` route, `isSuperadmin` on `/auth/me`, client-side SUPERADMIN_ONLY stages. Both apps share cookie sessions.
- `GET /api/v1/admin/registered` already computes the funnel per user (runCount, lastActiveAt, runsThisWeek/LastWeek, cameBack, avgStars). Drill-in endpoints already exist too: `/admin/users/:id/runs`, `/admin/runs/:id`, `/admin/guest-runs`.
- The admin app has a real mobile layout (drawer nav, responsive tables).
- Serving approach decided: same-origin sub-path `/admin` (vite `base: "/admin/"` + a prefixed static handler). "Admin never ships" (frontend-admin-split Phase 4, option A) is being deliberately reversed to its named option B.
- A clickable mock of the dashboard lives on the local Tests page (`/test` → "Live pulse — the founder dashboard", admin/src/stages/tests/live-pulse.js) — Carl's spec-by-example: pulse overview → manager (team + runs w/ types) → run (answers + feedback), plus guests.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend live fence | internal-tool guard (superadmin on live, admin locally), persona-runs blocked on live, `appEnv` on /auth/me | ✅ |
| 2 | Admin served at /admin | Both SPAs built + served on live; router base threading; Test engine/Tasks hidden on live; fence test | ⬜ |
| 3 | Pulse dashboard | `GET /api/v1/admin/pulse` + the Pulse stage; every card links to its "view all" (the four existing admin screens) | ⬜ |
| 4 | Drill-ins | Manager detail (team + ALL their runs incl. unfinished, w/ types + verdicts) and run detail (answers + feedback) | ⬜ |
| 5 | Runs explorer + honest guest tile | The "view ALL runs" sub-page (cross-company, filters: type/status/manager/date) + `claimed_at` marker so "guest became a signup" is real | ⬜ |
| 6 | Last-seen visits (optional) | `users.last_seen_at` + "active today/this week" | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Data feasibility (checked against schema.ts + superadmin service, 12 Jul 2026)
Every dashboard element traced to its live source:

| Mock element | Live source | State |
|---|---|---|
| Came back unprompted (Gate 1) | `listRegistered` → `cameBack` (2nd run ≤14d) | ✅ exists |
| Managers, runs this/last week, rating summary | `listRegistered` per-user tallies + `summary` | ✅ exists |
| Latest feedback / all feedback | `feedback_notes` → `/admin/feedback` + Feedback inbox screen | ✅ exists |
| Errors 7d / all errors | `error_logs` → `/admin/errors` + Error log screen | ✅ exists |
| Guest runs list | `listGuestRuns` (ownerless finished) + Guest runs screen | ✅ exists |
| Manager's runs w/ meeting type + rating | `userRuns` → `ctx.meetingType`, `rating` | ✅ exists (finished only — Phase 4 adds unfinished) |
| Run detail (briefing, rating) | `runDetail` | ✅ exists |
| Runs-per-day sparkline · run-type mix · drop-offs by stage | `sessions.created_at` / `meeting_type` (indexed) / `finished`+`stage` | 🔨 data exists, new reads (Phase 3) |
| Manager's team | `people` table (name, role, per-person run counts) | 🔨 data exists, new superadmin read (Phase 4) |
| Answers typed in a run | session `state` jsonb / `run_artifacts` | 🔨 data exists, needs extraction (Phase 4) |
| Verdict chip per run | `feedback_notes.run_id` + `verdict` | 🔨 data exists, needs join (Phase 4) |
| ALL runs page (cross-company, filterable) | no endpoint/screen today | 🔨 new (Phase 5) |
| "Guest became a signup" | ❌ no marker — a claimed run silently leaves the guest pile | Phase 5 adds `claimed_at`/`claimed_by`; until then the tile shows unclaimed count only |
| "Last active" from logins (not just runs) | ❌ no source (`users.last_seen_at` missing) | Phase 6 |

## Current state
Phase 1 ✅ GREEN-LIT (Sat 12 Jul 2026) — Carl walked the local admin (Role words · Meeting arcs · Guide · Test engine all load, nothing forbidden) and said go. Proof stands: typecheck clean, 126/126 tests (baseline 124/124). Committed path-scoped, staging only the Phase-1 hunks in the shared `server.ts` (the parallel promises-loop route left untouched for that session). The dashboard mock (full-width, with manager → team/runs → answers/feedback drill-ins, guests, run types) is on the local Tests page (/test → "Live pulse"). Data feasibility audit done 12 Jul — every mock element traced to a live source (table below); two honest gaps named (guest-claim marker → Phase 5, login-based last-seen → Phase 6). Now in flight: **Phase 2 — serve /admin on live** (both SPAs built + served, router base threading, Test engine/Tasks hidden on live). ⚠️ Several Phase-2 target files (`admin/src/router.js`, `main.js`, `state.js`, `ui/app-nav.js`, `server.ts`) are already dirty from parallel sessions — build in a worktree or stage hunk-scoped.

## Parked
- Login-based visit tracking beyond last_seen_at (cohorts, retention curves) — post-validation.
- Per-company drill-in charts, extra dashboards — not needed for Gate 1.
- Superadmin-gating heartbeat/engine-edit routes ALWAYS (not just on live) — revisit if managers ever get accounts that shouldn't see internals locally.
- Admin dist served behind the session cookie (static assets currently public, data gated) — marginal gain now.
