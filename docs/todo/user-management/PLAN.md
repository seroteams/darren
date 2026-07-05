# User management

**Goal:** Turn the superadmin's cross-company user view into a clean **"User management"** table where every registered user can be managed — change role, deactivate/reactivate, delete, reset/invite — with hard safety rules so no action can lock out an operator, wipe history, or leave a company leaderless.
**Driver:** Carl
**Created:** 2026-07-04

## Done means
- The superadmin screen is renamed **"User management"** and shows a clean **flat table** of everyone registered (name + email · role badge · company · activity), replacing the old stacked cards.
- Each row has a **`⋯` menu**: view their 1:1s, change role, deactivate/reactivate, delete, reset password/invite.
- Guardrails hold server-side: no self-delete/deactivate, no touching a `SUPERADMIN_EMAILS` account, never leaving an org with zero active manager/admin.
- Every attempt (success, blocked, failed) is in the superadmin audit log; reset/invite tokens never are.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 0 | Safety and schema check | Read-only: confirm access (done), schema, `runs.userId` nullability, session/token facts — go/no-go | ⬜ |
| 1 | User management table + rename | Rename Registered → "User management"; company-grouped table; row opens drilldown; "Coming back?" trend + sort | ✅ done (2026-07-05) |
| 2 | Change a user's role | `PATCH …/role` + `⋯` role picker; last-manager demotion blocked | ✅ done (2026-07-05) |
| 3 | Deactivate / reactivate | `deactivatedAt` column + routes; login blocked + live sessions killed | 🔨 in progress |
| 4 | Delete a user | `DELETE …/:id`; runs kept-but-orphaned; confirm + guardrails | ⬜ |
| 5 | Reset password / invite | `POST …/reset-password`; single-use hashed expiring token → copyable link | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 built + refined (2026-07-04) — awaiting Carl's walk.** Carl said "skip ahead" (skip the PG8/PG9 walk, start the redesign now — flagged as pace drift, his call). The old stacked-card "Registered" screen is now a **flat "User management" table**: nav rail + page title renamed; rows are User (name+email) · Role pill (admin/manager/member) · Company · **"Coming back?"**. The **whole row is clickable** → drilldown (name is a real `<button>` for keyboard/AT). Zero-user companies (Default pre-auth) kept as a caption so nothing's lost. **Frontend only — no backend/endpoint change.**

Then Carl asked for an independent **UX/UI design review** (via the `impeccable` skill + a design-director subagent). Verdict: code solid, **framing** off — **23/40 "needs work."** Carl chose the safe wins ("A"): (1) **surface "coming back?"** — a ▲/▼/• trend per row (this-week vs last-week) leads the activity cell, table **default-sorts by last-active** so drifters sink; (2) **dropped the `⋯` menu** — its one item duplicated the now-clickable row (returns in Phase 2 with real actions); (3) **tidied** the ratings into a labelled "Across the alpha" block + the footnote into a caption. Parked as **his call** (they reverse earlier decisions): rename away from "User management", and company-first grouping.

Carl then chose **"B" (group by company) + finish**. The table is now **grouped by company** (company = a header band with people-count + freshest activity), the redundant **Company column dropped**, companies ordered by freshest activity with empties greyed at the bottom (this also absorbed the "No users yet" footnote). Name kept **"User management"** (Carl re-affirmed it in the nav).

**Phase 1 done + committed 2026-07-05** on Carl's "finish". Verified live (logged in as `carl@seroteams.com`): 4 company groups render in activity order, Sero (dev) on top (Carl ▲ / Dev Member • steady), Default (pre-auth) greyed "No users yet" at the bottom; row-click + name-button open the drilldown. Offline green: `npm test` **60/60**, typecheck clean, build clean; 14px floor holds. Committed in two commits: the screen `d2bf9ec2` ([admin-registered.ts](../../../admin/src/stages/admin-registered.ts), [admin-user-detail.ts](../../../admin/src/stages/admin-user-detail.ts) back label, [design.css](../../../admin/src/styles/design.css) `.um-*`, docs) + the nav-label rename `53f1f132` ([app-nav.js](../../../admin/src/ui/app-nav.js), split out via revert-reapply-restore so Carl's in-progress **Universe** nav item stayed uncommitted). **Next: Phase 2 — change a user's role** (`⋯` menu returns here with real actions).

**Phase 2 ✅ done + verified end-to-end + closed 2026-07-05.** `PATCH /api/v1/admin/users/:id/role` (superadmin-gated + origin-guarded, last-manager demotion blocked 409, every attempt audited) was committed `ac0359a7`. Carl walked it live (worked); the destination was verified, not just the code — `Dev Member` is now `manager` in the **live Neon `users` table** (05:44:58) with a matching `role member→manager` line in `content/data/audit/superadmin.jsonl`. The 404 Carl first hit was a stale :3001 API (the running process pre-dated the route); restarting it (concurrency respawns fresh code) fixed it — no code change. **Next: Phase 3 — deactivate/reactivate.**

**Phase 3 🔨 backend done + green + committed (`aaee96b5`), 2026-07-05 — frontend + walk remain.** Baseline before touching: `npm test` **65/65** green. Landed: nullable `users.deactivated_at` (migration `0005`, **applied to live Neon** — column verified present, timestamptz, nullable); login now refuses a deactivated user even with the right password; superadmin `deactivateUser`/`reactivateUser` service that **kills live sessions immediately** on deactivate, with guardrails blocking (a) deactivating yourself, (b) a `SUPERADMIN_EMAILS` account, (c) a company's last *active* manager/admin — every attempt audited; the Phase 2 last-lead check was refined to count only ACTIVE leads. Routes + controller wired. **8 new tests, all green; root typecheck clean.**
- ⚠️ **server.ts route registration left UNCOMMITTED** — that file is entangled with other sessions' in-flight edits (persona-runs, heartbeat); my two POST routes are live on disk but not in `aaee96b5`. Commit them once the tree settles (or cherry-pick just those hunks).
- **Still to do before Carl's walk:** (1) frontend — deactivate/reactivate in the `⋯` menu + a clear "Deactivated" row state (the view already exposes `user.deactivated`); (2) **restart the running :3001 API** (it predates these routes, like the Phase 2 404).

Plan revised 2026-07-04 after Carl's design feedback: the surface is a **renamed, redesigned flat table** (his call), with the table build as its own Phase 1 before any actions. Baseline (this session, before touching anything): `npm test` 60/60 green.

Superadmin access is already confirmed (this session): `.env` has `SUPERADMIN_EMAILS=carl@seroteams.com`, and logging in as `carl@seroteams.com` / `serodev123` shows the screen live. Phase 0's remaining work (schema/`runs.userId` nullability + session/token/email facts) is still needed before Phase 2.

## Parked
- Per-company manager-facing user management (customer-facing) — Carl chose superadmin-only for now.
- Manual "add user" from the console, bulk actions / CSV, edit name/email inline, move a user between companies, a `/admin/users` route alias, search/sort/pagination on the table (small N for now).
- Email-templating polish (Phase 5 ships the minimum that proves the flow).
