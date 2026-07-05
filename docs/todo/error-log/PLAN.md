# Error log

**Goal:** A single **Error log** screen where you (superadmin) can see every error any user hits — across every company, newest first — so when someone says "it broke," you go in and see exactly what happened: who, where, what, when.
**Driver:** Carl
**Created:** 2026-07-05

## Done means
- A new **Error log** page in the admin nav (superadmin-only, like User management).
- A clean **table**: When · Env (Local / Live) · Who (name + company) · Where (screen/route) · What went wrong · Status — newest first.
- **One pane for local + live:** the same screen shows errors from both Carl's local dev *and* the published live Sero (both write to one Neon), each row tagged so you can tell at a glance and filter to just one.
- It captures **both sides**: backend errors (API 500s — OpenAI timeouts, engine fails, missing files) and browser errors (blank-screen crashes, failed page loads).
- Row-click opens **full detail** (stack trace, request info) and lets you **mark it resolved**.
- Secrets are never stored; the log never slows down or breaks a user's request; old rows auto-purge so it can't bloat.

## The two settled choices (confirmed by Carl in chat 2026-07-05)
- **Storage = a new database table** (`error_logs` in Postgres/Neon), not a text file. **Confirmed with the going-live lens:** Neon lives *outside* the app server, so it survives every redeploy/restart and is backed up — a file on the app's own disk gets wiped on deploy on most hosts (Vercel/serverless/containers), so the log would silently empty itself after every push. The DB is also what powers the screen (sort, filter, mark-resolved). **Backstop kept:** we do *not* remove the existing `console.error` — it stays as the safety net for the one case the DB can't record (the DB itself being down → that still lands in the host's platform logs).
- **Who sees it = superadmin-only (just Carl).** It logs errors from *everyone*; only Carl reads it. A per-manager "your team's errors" view is **parked**.

## Why this is smaller than it looks
Two patterns already exist and we reuse them:
- **One capture point already exists.** Every API error funnels through `v1Route` ([backend/api/middleware/v1-route.ts](../../../backend/api/middleware/v1-route.ts)), which already logs 500s to the terminal. Phase 1 tees those into the table.
- **We've built this shape before.** The superadmin audit trail ([backend/api/middleware/superadmin-audit.ts](../../../backend/api/middleware/superadmin-audit.ts)) records "who did what, when" — an error log is the same idea plus "what broke." The **User management** table ([admin/src/stages/admin-registered.ts](../../../admin/src/stages/admin-registered.ts)) is the recipe for the screen.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 0 | Baseline + schema check | Read-only: confirm DB/migration path, lock the `error_logs` columns + capture scope, baseline `npm test` — go/no-go | ✅ |
| 1 | Store + catch backend errors | `error_logs` table + migration; write one row on every API 5xx at `v1Route` (+ legacy router). Redacts secrets, never blocks the response | ✅ |
| 2 | The Error log screen | Superadmin-only page + nav item (mirrors User management); read endpoint; the table, newest first | 🔨 |
| 3 | Catch browser errors too | Global crash handler + failed-fetch reporter in the app → blank-screen crashes + failed loads land in the log, tagged with the screen | ⬜ |
| 4 | Detail + tidy-up | Row-click detail (stack, request info); filters + "mark resolved"; auto-purge old rows | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ signed off + Phase 2 built (2026-07-05) — awaiting Carl's Phase 2 QA walk.** Phase 1 was proven live (a real error wrote a correct, tagged, secret-safe row to Neon, then cleaned up) and Carl green-lit it. Committed: Phase 1 `4a3f03fb`, Phase 2 `a15af8b1`. (Phase 0/1 detail lives in [phase-0.md](phase-0.md)/[phase-1.md](phase-1.md).)

**Phase 2 — built, verified offline + live-read against Neon, NOT yet signed off:**
- **The screen:** [admin-error-log.ts](../../../admin/src/stages/admin-error-log.ts) — the table (Where[env] · When · Who · Route+source · What · Status), newest first, Local/Live + API/Browser pills, loading / empty / error states, 14px floor.
- **Nav item** "Error log" (superadmin-only, Admin group) + full wiring — [app-nav.js](../../../admin/src/ui/app-nav.js), [router.js](../../../admin/src/router.js) (`/admin/errors` + ADMIN_ONLY gate), [state.js](../../../admin/src/state.js), [main.js](../../../admin/src/main.js).
- **Read endpoint** `GET /api/v1/admin/errors` (superadminV1-gated — the 403 is the real wall) → a dedicated [error-log service/repo/controller](../../../backend/api/services/error-log/) (its own module so Phase 4's mutations don't touch superadmin's read-only invariant). The repo LEFT JOINs users + orgs for name + company; anonymous rows survive. Newest 200.
- **Verified:** `npm test` **66/66**, backend + admin typecheck clean, admin build OK. The pg leftJoin was **verified live against Neon** — a real user's row joined to name + company, an anonymous row kept null who, newest-first, both cleaned up.
- **To QA (Carl):** ⚠️ **restart the API server first** (the running :3001 predates the new `/admin/errors` route). Then log in → nav **Error log** → the screen loads. It's empty now ("nothing's broken"); trigger a real 500 to watch a row appear (or I can seed one).

**Next:** Phase 3 — catch browser crashes / failed loads too.

**Parallel track:** several other Claude sessions are active in this repo (user-management P3, mobile-responsive, page-heartbeat, design-system) — my commits are scoped to error-log files only.

## Parked
- **⚠️ Follow-up flagged (NOT this plan):** the existing **audit log, feedback, and run logs** all write to **local disk** (`content/data/…`). Same wipe-on-deploy risk once Sero is hosted — worth moving to the DB (or persistent storage) before real customers. Raised 2026-07-05 during this decision; belongs in the going-live track, not here.
- **Per-manager "your team's errors" view** (customer-facing) — superadmin-only for now.
- Alerting / email-on-error, error grouping/counts ("this happened 40×"), charts/trends.
- Capturing 4xx (validation, 401, 404) — noisy; 5xx + browser crashes only to start.
- Search box, pagination (small N for the alpha; a simple newest-N limit covers it).
- Wiring the same rows into the existing `logs/` run-transcript tooling.
