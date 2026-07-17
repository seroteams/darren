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
| 2 | Admin served at /admin | Both SPAs built + served on live; router base threading; Test engine/Tasks hidden on live; fence test | 🔨 built on branch, awaiting walk |
| 3 | Pulse dashboard | `GET /api/v1/admin/pulse` + the Pulse stage; every card links to its "view all" (the four existing admin screens) | 🔨 built on branch, awaiting walk |
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

## Current state (RESUME HERE — updated by the clean-up sweep 2026-07-17)
**P1 ✅ closed + committed to main (`dab7d403`).** **P2 + P3 BUILT + verified, now MERGED to `main` (`ffc5165d`, 2026-07-14) — but NOT yet Carl-walked / green-lit.** (The old "merge blocked on `work/admin-serve`" note below is superseded — the branch merged and was deleted; its orphaned worktree folder `../serolocal-admin-serve` was removed in the sweep.)

- **P1 — backend live fence ✅** green-lit ("okay next"). typecheck clean, 126/126. On main.
- **P2 — serve /admin ✅ built** (`b3196472`): vite base `/admin/`, base-aware router (`withBase`/`stripBase`/`replaceUrl`), `static.ts` `{prefix,noindex}`, `server.ts` mounts `admin/dist` at `/admin`, `build:all` + `render.yaml`, Test engine/Tasks trimmed on live + deep-link bounce. New `scripts/test-admin-serving.js` **13/13** (real prod boot: `/admin`=admin, `/`=customer, deep-link fallback, noindex, logged-out 401, no secret values). typecheck clean.
- **P3 — Pulse dashboard ✅ built** (`833bc2e3`): `GET /api/v1/admin/pulse` (superadmin) folds `listRegistered` + 3 new time-series reads (runs/day 14d, type mix 7d, drop-offs 14d) + guest/error counts + latest feedback; new `admin/src/stages/admin-pulse.ts` at `/pulse` (superadmin-only, top of Admin nav, live boot lands here), every card links to its view-all. `state.d.ts` re-synced. superadmin test +1 (deterministic), **41/41**. Renders with real local data.
- Full suite **126/127** throughout (the 1 fail = known fresh-worktree `test-persona-bench`, missing untracked `_runtime` files — not a regression). $0 (no paid runs).
- **Blocker fix landed:** the orphaned `promise-confirm.css` (a committed `@import` with no committed file, swept in by past-1on1-view P2 `ee8fb475`) was committed to main (`6aadec58`) so a clean checkout / the live Render build no longer fails.

**~~⚠️ Merge to main is BLOCKED~~ (RESOLVED 2026-07-14)** — the merge that this note warned about has since landed on `main` (`ffc5165d`); the `work/admin-serve` branch is gone. No further merge step is needed.

**To resume / walk locally:** P2 + P3 are on `main` now — run the app normally (no separate worktree). **Admin Pulse is at `/admin/pulse`.**

**Next:** Carl walks P2 (`/admin/` deep-link reload) + P3 (the Pulse screen) → green light → phase-close trackers → the 2 Render steps + `/release`. Then P4 (drill-ins) · P5 (runs explorer) · P6 (last-seen).

## Parked
- Login-based visit tracking beyond last_seen_at (cohorts, retention curves) — post-validation.
- Per-company drill-in charts, extra dashboards — not needed for Gate 1.
- Superadmin-gating heartbeat/engine-edit routes ALWAYS (not just on live) — revisit if managers ever get accounts that shouldn't see internals locally.
- Admin dist served behind the session cookie (static assets currently public, data gated) — marginal gain now.
