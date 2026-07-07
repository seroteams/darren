# Phase 007 — The login screen (fold into the admin console)

**Goal:** Make login *real in the app you can click* — the admin console asks you to log in, you land in as your own company, a refresh keeps you in, logout returns you to login — and point the console's data at the logged-in company so two companies cannot see each other's runs.
**Driver:** Carl
**Created:** 2026-06-29

## Done means
- You open the console and get a login / register screen; signing in lands you in the app.
- A refresh keeps you logged in; logout returns you to login; logged-out, a screen turns you away.
- The console reads/writes **your company's** data, not the shared pre-auth placeholder org.
- Two different companies cannot see each other's sessions or runs.

## Foundation already in place (from Phase 006)
This phase wires a UI onto auth that already works — it is not from scratch:
- `/api/v1/auth/*` endpoints exist: register, login, logout, me, me/runs — see [backend/api/server.ts](../../../../backend/api/server.ts) lines 79-83. Cookie (`sero_session`, httpOnly, 7-day) is automatic.
- Org-fenced `/api/v1/` versions already exist for sessions, runs, arcs, role-lexicons, lexicon, pipeline, etc. — [backend/api/server.ts](../../../../backend/api/server.ts) lines 85-342. The admin's [admin/src/api.js](../../../admin/src/api.js) currently calls the **legacy `/api/`** aliases, which are pinned to `DEFAULT_ORG_ID` ([backend/db/sessions-store.ts:20](../../../../backend/db/sessions-store.ts)).

## Decisions (confirmed with Carl)
- **Fold login into the existing admin app** — no separate customer-facing app this round.
- **Re-point the console's data to the real company now** (not deferred) — migrate the client off the placeholder-org legacy routes onto the org-fenced v1 routes.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Login gate + screens | Console requires login; register/login/logout screens; boot gate calls `/auth/me` | ✅ done (green-lit + committed 2026-06-29) |
| 2 | Re-point data to the org | Client calls org-fenced `/api/v1/` routes; two companies are isolated in the UI | ✅ done (green-lit + committed 2026-06-29, approach A) |

⬜ not started · 🔨 in progress · ✅ done (tested + green-lit)

## Current state
**Baseline (free, 2026-06-29):** `npm test` → 49/49 ✅, `npm run typecheck` clean ✅.

**Phase 1 built + self-verified (2026-06-29) — awaiting Carl's QA green light.** Folded login into the
admin console: auth calls in `api.js` (register/login/logout/me), a `user` slice in `state.js`
(preserved across `resetSession`), LOGIN/REGISTER stages + routes, a boot gate that calls `/auth/me`
(401 → login), a logout button in the nav (nav hidden on auth screens), and the shared `json()`
helper taught to read the v1 nested `{error:{message}}` shape. Register has no cookie, so it
auto-logs-in after creating the account. Live walk against the running dev server (API 3001 + Vite 3000,
local Postgres) passed all 5 scenarios: register→in, refresh→in, logout→out (server-side 401),
login→in, deep-link `/compare` logged-out → bounced to `/login`; bad login shows a readable message.
`npm test` 49/49 ✅, typecheck clean ✅. **Not committed** (commits on Carl's green light).

**Dev convenience (2026-06-29):** the login screen prefills a local dev account
(`carl@seroteams.com` / `serodev123`, seeded in the dev DB) and focuses the Log in button, so you're
never locked out while testing. Gated behind `import.meta.env.DEV` → stripped from production builds;
overridable via `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD`. The login screen still shows and
stays testable (unlike the `DEV_AUTOLOGIN` side-door, which skips it entirely).

**Phase 1 green-lit + committed (2026-06-29).** Carl walked all 5 QA scenarios and gave the go
("logged in and out and work swell"). Phase 1 committed locally. The build board's 007 entry
([admin/src/stages/tasks.js](../../../../admin/src/stages/tasks.js)) was **re-framed to the fold-in**:
renamed "The login screen · Folded into the admin console", its four steps now describe fold login →
register/login screens → wire to backend (all ✅ Built) → point the data at your company (⚪ Phase 2).
The old "separate customer app" wording is gone.

**Phase 2 green-lit + committed (2026-06-29) — approach A (tag file-runs by company).** New sessions are
stamped with the caller's company (`serialize` → disk + Postgres); the run-history reads fence by it
(`runOwnedByOrg`) through engine → repo → service → controller; `admin/src/api.js` sessions + runs calls
moved to the org-fenced v1 routes. Carl accepted on the offline tests (`npm test` 51/51, typecheck clean)
plus a live free smoke (logged-in fenced `/api/v1/runs/recent` = 0, anonymous legacy = 3 — the wall live
over HTTP), and deferred the paid two-company walk. See [phase-2.md](phase-2.md) "Build progress".

**Both phases ✅ — plan closed out to `docs/archive/done/`.**

## Parked (cut scope — not this phase)
- **Harden: fence live-session-by-id cross-open (follow-up).** The runs-history surface is fully fenced; the
  live-runner by-id reads/writes (snapshot/question/answer/streams) don't yet org-check the resolved session.
  Not a browsable surface (you only drive a session whose id you hold), so deferred. Thread `orgId` through the
  session controller's id resolvers (or a small async ownership guard) when hardening.
- Org **name** on the authed landing (login/register return no `orgName`; show "Welcome, {name}!" for now; add `GET /api/v1/orgs/me` later when the prep flow needs it).
- Password reset, email verification, invitations, multi-org switching, roles/permissions UI, SSO.
- Refresh-token rotation (server-side sessions are sufficient this round).
- A separate customer-facing `frontend/` app (deferred; folding into admin for now).
