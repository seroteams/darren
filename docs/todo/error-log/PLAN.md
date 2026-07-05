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
| 3 | Catch browser errors too | Global crash handler + failed-fetch reporter in the app → blank-screen crashes + failed loads land in the log, tagged with the screen | 🔨 |
| 4 | Detail + tidy-up | Row-click detail (stack, request info); filters + "mark resolved"; auto-purge old rows | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ + Phases 2 & 3 built (2026-07-05) — awaiting Carl's walk of 2 & 3.** Carl green-lit Phase 1 (proven live). Committed: P1 `4a3f03fb`, P2 `a15af8b1`, P3 `52145f05`. Offline green throughout: `npm test` **67/67**, backend + admin typecheck clean, admin build OK.

**Phase 2 (the screen) — built:** superadmin **Error log** page ([admin-error-log.ts](../../../admin/src/stages/admin-error-log.ts)) + nav item (superadmin-only, Admin group) + `GET /api/v1/admin/errors` → a dedicated [error-log service/repo](../../../backend/api/services/error-log/) that LEFT JOINs users + orgs for name + company (anonymous rows survive). Table: Where[env] · When · Who · Route+source · What · Status, newest first, Local/Live + API/Browser pills, plus a **Local / Live toggle** above the table (filter to just your machine or just the live Sero — pulled forward from Phase 4 at Carl's request). Read path verified live against Neon.

**Phase 3 (browser capture) — built:** client crashes + failed loads now POST to `/api/v1/errors` (origin-guarded, per-IP rate-limited) → `source:"browser"` rows. Global `window.onerror`/`unhandledrejection` ([error-reporter.js](../../../admin/src/ui/error-reporter.js)) + the render-catch + the ERROR stage all report — deduped/throttled, never loops on itself. Browser write+read verified live against Neon.

**To QA (Carl):** ⚠️ **restart the API server** (running :3001 predates the new routes), then log in → **Error log**. I **seeded 5 demo rows** (marked `details.demo=true`) so the screen shows a populated table like the mockup — say "clear demo" and I delete them. Trigger a real error to watch live capture.

**Next:** Phase 4 — row detail, filters, mark-resolved, auto-purge.

⚠️ **Concurrency note:** commit `52145f05` also swept a parallel session's staged test-engine-hub files (all sessions share one git index in this working copy). Nothing lost — flagged to Carl; recommend a separate git worktree per session. `shared/api.reportClientError` is in the tree but its file is co-mingled, so it rode along in that broad commit too.

## Parked
- **⚠️ Follow-up flagged (NOT this plan):** the existing **audit log, feedback, and run logs** all write to **local disk** (`content/data/…`). Same wipe-on-deploy risk once Sero is hosted — worth moving to the DB (or persistent storage) before real customers. Raised 2026-07-05 during this decision; belongs in the going-live track, not here.
- **Per-manager "your team's errors" view** (customer-facing) — superadmin-only for now.
- Alerting / email-on-error, error grouping/counts ("this happened 40×"), charts/trends.
- Capturing 4xx (validation, 401, 404) — noisy; 5xx + browser crashes only to start.
- Search box, pagination (small N for the alpha; a simple newest-N limit covers it).
- Wiring the same rows into the existing `logs/` run-transcript tooling.
