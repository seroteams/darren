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
| 2 | Change a user's role | `PATCH …/role` + `⋯` role picker; last-manager demotion blocked | ⬜ |
| 3 | Deactivate / reactivate | `deactivatedAt` column + routes; login blocked + live sessions killed | ⬜ |
| 4 | Delete a user | `DELETE …/:id`; runs kept-but-orphaned; confirm + guardrails | ⬜ |
| 5 | Reset password / invite | `POST …/reset-password`; single-use hashed expiring token → copyable link | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 built + refined (2026-07-04) — awaiting Carl's walk.** Carl said "skip ahead" (skip the PG8/PG9 walk, start the redesign now — flagged as pace drift, his call). The old stacked-card "Registered" screen is now a **flat "User management" table**: nav rail + page title renamed; rows are User (name+email) · Role pill (admin/manager/member) · Company · **"Coming back?"**. The **whole row is clickable** → drilldown (name is a real `<button>` for keyboard/AT). Zero-user companies (Default pre-auth) kept as a caption so nothing's lost. **Frontend only — no backend/endpoint change.**

Then Carl asked for an independent **UX/UI design review** (via the `impeccable` skill + a design-director subagent). Verdict: code solid, **framing** off — **23/40 "needs work."** Carl chose the safe wins ("A"): (1) **surface "coming back?"** — a ▲/▼/• trend per row (this-week vs last-week) leads the activity cell, table **default-sorts by last-active** so drifters sink; (2) **dropped the `⋯` menu** — its one item duplicated the now-clickable row (returns in Phase 2 with real actions); (3) **tidied** the ratings into a labelled "Across the alpha" block + the footnote into a caption. Parked as **his call** (they reverse earlier decisions): rename away from "User management", and company-first grouping.

Carl then chose **"B" (group by company) + finish**. The table is now **grouped by company** (company = a header band with people-count + freshest activity), the redundant **Company column dropped**, companies ordered by freshest activity with empties greyed at the bottom (this also absorbed the "No users yet" footnote). Name kept **"User management"** (Carl re-affirmed it in the nav).

**Phase 1 done + committed 2026-07-05** on Carl's "finish". Verified live (logged in as `carl@seroteams.com`): 4 company groups render in activity order, Sero (dev) on top (Carl ▲ / Dev Member • steady), Default (pre-auth) greyed "No users yet" at the bottom; row-click + name-button open the drilldown. Offline green: `npm test` **60/60**, typecheck clean, build clean; 14px floor holds. Files committed: [admin-registered.ts](../../../admin/src/stages/admin-registered.ts), [admin-user-detail.ts](../../../admin/src/stages/admin-user-detail.ts) (back label), [design.css](../../../admin/src/styles/design.css) (`.um-*`) + these docs. **One loose end:** the nav **label** rename lives in [app-nav.js](../../../admin/src/ui/app-nav.js) alongside Carl's new **Universe** nav item, so that file was **left uncommitted** — it rides with the Universe change. **Next: Phase 2 — change a user's role** (`⋯` menu returns here with real actions).

Plan revised 2026-07-04 after Carl's design feedback: the surface is a **renamed, redesigned flat table** (his call), with the table build as its own Phase 1 before any actions. Baseline (this session, before touching anything): `npm test` 60/60 green.

Superadmin access is already confirmed (this session): `.env` has `SUPERADMIN_EMAILS=carl@seroteams.com`, and logging in as `carl@seroteams.com` / `serodev123` shows the screen live. Phase 0's remaining work (schema/`runs.userId` nullability + session/token/email facts) is still needed before Phase 2.

## Parked
- Per-company manager-facing user management (customer-facing) — Carl chose superadmin-only for now.
- Manual "add user" from the console, bulk actions / CSV, edit name/email inline, move a user between companies, a `/admin/users` route alias, search/sort/pagination on the table (small N for now).
- Email-templating polish (Phase 5 ships the minimum that proves the flow).
