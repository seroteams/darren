# Admin access guard — lock the internal tooling behind an admin login

**Goal:** The internal/admin API endpoints (pipeline, checks, regression, lexicon promotion, role-lexicons, arcs, suggest-fix, library) stop being reachable by just anyone — they require a logged-in **admin/owner** — while the customer prep flow keeps working exactly as today. This is Option A from the 2026-07-01 "revisit the split" discussion: guard now, full app split later.
**Driver:** Carl
**Created:** 2026-07-01

## Why this exists
We deliberately kept one app (admin + customer flow together) through Phases 001 → 007 to move fast while there were no real customers. That deferral is now the risk: the internal tooling has **no login wall at all** (pipeline/checks/regression are fully open), and there is **no owner-vs-member role check** anywhere. The moment a real manager logs in, they're one URL away from internal endpoints. This plan closes that without the big surgery of a separate `frontend/` app.

## Done means
- Logged **out**, the internal tooling endpoints refuse you (they don't quietly serve internal data).
- A logged-in **member** (non-admin) is refused the internal tooling (403); an **owner/admin** still gets in.
- In the console, a non-admin doesn't even see the admin-only tools.
- The customer prep flow (start → session → focus/plan/evaluation, meeting-type picker) works unchanged for any logged-in user.
- `npm test` green; typecheck clean.

## The line we're drawing (endpoint classification)
**Admin-only (lock behind the guard):**
- `arcs` — list / save / reset (relational-arc catalogue editor)
- `checks/run`, `regression/run`
- `pipeline/status`, `pipeline/manifest`
- `lexicon/promote` (pending + apply)
- `role-lexicons` (list + term add/remove)
- `suggest-fix`
- `library` (serves generated internal review artifacts)

**Customer flow (leave as today — login or the open-start decision):**
- `sessions.*` (the live prep runner — already company-fenced)
- `catalog` reads: `meeting-types`, `personas` (the prep picker needs them)
- session-scoped `lexicon` (candidates / scope / decisions — part of a session)
- `auth.*`; session **start** stays open (prior decision, 2026-07-01)

**Flagged for Carl to settle (in Phase 2):**
- `runs` review / archive / delete — a run belongs to the customer's company (already login + org-fenced), but the **Review verdict** is really *your* internal QA tool. Keep as customer data, or pull the verdict/delete/archive actions admin-only?
- `catalog` reads — leave open, or require login? (Low risk either way.)

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Require login on the internal tooling | A `requireAuth` wall on every admin-only endpoint above — logged-out callers get 401 instead of internal data. No role logic yet. | ✅ done (green-lit + committed 2026-07-01) |
| 2 | Add the admin-role wall + hide the UI | Upgrade those endpoints to require an owner/admin **role** (403 for a member), hide the admin-only tools in the console from non-admins, add a way to create a member so we can actually test it, and settle the flagged edge cases. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit by Carl + committed (2026-07-01). Phase 2 not started (needs a go).**

**Baseline (free, 2026-07-01):** `npm test` → 51/51 ✅, `npm run typecheck` clean ✅. (No paid gate — Phase 1 is pure auth-routing, nothing the engine/prompts touch; a live gate would prove nothing here and needs a separate go-ahead.)

**Built:** a reusable login-route wrapper [admin-guard.ts](../../../backend/api/middleware/admin-guard.ts) (`requireLoginRoute` — `buildIdentity → requireAuth`, injectable lookup so it's DB-free to test), wired into [server.ts](../../../backend/api/server.ts) via two terse helpers (`adminV1` / `adminLegacy`) on every admin-only route (both the `/api/v1/` and legacy `/api/` variants): arcs, checks, regression, pipeline, lexicon-promote, role-lexicons, suggest-fix, library. Customer flow (sessions, catalog reads, session-scoped lexicon, auth, open start) untouched. **After** `npm test` → 52/52 ✅ (added [admin-guard.test.ts](../../../backend/api/middleware/admin-guard.test.ts): anon → 401 + handler never runs, logged-in → runs, dev side-door → runs), `npm run typecheck` clean ✅.

Facts the plan rests on (verified 2026-07-01): identity carries `roles: string[]` ([request-context.ts](../../../backend/api/middleware/request-context.ts)); today every registered user is `"owner"` (register creates the org owner — [auth.repo.ts:65](../../../backend/api/services/auth/auth.repo.ts)); the dev side-door is also `["owner"]`. So Phase 1 breaks nothing Carl does today; the member-vs-owner distinction only becomes testable once Phase 2 adds a member account.

**Phase 1 QA:** Carl walked all 3 scenarios and gave the go ("all passed"). Committed local.
**Next:** Phase 2 (owner/admin role wall + hide the admin UI + a testable member account) — awaiting Carl's go.

## Parked
- **Full app split** (a real separate customer-facing `frontend/` app, `admin/` staff-only, separate deploy) — Option C from the revisit; the original Phase 007+ vision. Bigger, later.
- **Route-prefix split** (`/api/admin/*`) — Option B; nice for auditability, not needed for the security fix.
- **Roles UI** (invite teammates, assign owner/admin/member) — Phase 006 scaffolded the data; the management screen is its own feature.
- **Origin-guard rework** — the localhost-hardcoded origin guard is a dev guard, not a prod CSRF defense; separate hardening, not this plan.
