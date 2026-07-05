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
| 1 | Store + catch backend errors | `error_logs` table + migration; write one row on every API 5xx at `v1Route` (+ legacy router). Redacts secrets, never blocks the response | 🔨 |
| 2 | The Error log screen | Superadmin-only page + nav item (mirrors User management); read endpoint; the table, newest first | ⬜ |
| 3 | Catch browser errors too | Global crash handler + failed-fetch reporter in the app → blank-screen crashes + failed loads land in the log, tagged with the screen | ⬜ |
| 4 | Detail + tidy-up | Row-click detail (stack, request info); filters + "mark resolved"; auto-purge old rows | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 0 ✅ closed + Phase 1 built (2026-07-05) — awaiting Carl's Phase 1 QA walk.** Baseline before the build: `npm test` 62/62; after: **65/65** green, typecheck clean. (Phase 0's detail — migration path, locked columns, secret-safety — lives in [phase-0.md](phase-0.md).)

**Phase 1 — built, verified offline, NOT yet signed off:**
- **Table live on Neon.** `error_logs` added to [schema.ts](../../../backend/db/schema.ts); migration `0004_nifty_iron_monger.sql` generated + applied to Neon; **verified by direct query** (14 columns, `org_id`/`user_id` nullable, 3 indexes, 0 rows).
- **Capture wired at both catch points** — [error-log.ts](../../../backend/api/middleware/error-log.ts) (pure `errorLogEntry` builder + `logApiError` sink, mirrors superadmin-audit.ts) called from [v1-route.ts](../../../backend/api/middleware/v1-route.ts) (all v1 5xx) and [router.ts](../../../backend/api/router.ts) (legacy 5xx). Fire-and-forget; `console.error` kept as the backstop.
- **Environment tag** stamped local vs production by `resolveEnvironment()` (APP_ENV/SERO_ENV override, else NODE_ENV).
- **Secret-safe:** identity + method + path + status + code + message + stack only; the dev side-door's non-uuid identity is nulled so the FK never breaks (email still carries who).
- **Tested:** new [error-log.test.ts](../../../backend/api/middleware/error-log.test.ts) 7/7 (builder redaction, uuid-guard, env resolve, no-throw-without-DB). Full suite **65/65**, typecheck clean.
- **Not committed** — awaiting Carl's QA (green light = commit). Phase 0 docs committed separately.

**Next:** Carl walks the Phase 1 scenarios (trigger a real error → the tagged row appears; normal use writes nothing; a 4xx writes none). On his go → commit Phase 1 → Phase 2 (the screen + nav).

**Parallel track:** [user-management](../user-management/PLAN.md) Phase 2 is still open; Carl chose to run this alongside it.

## Parked
- **⚠️ Follow-up flagged (NOT this plan):** the existing **audit log, feedback, and run logs** all write to **local disk** (`content/data/…`). Same wipe-on-deploy risk once Sero is hosted — worth moving to the DB (or persistent storage) before real customers. Raised 2026-07-05 during this decision; belongs in the going-live track, not here.
- **Per-manager "your team's errors" view** (customer-facing) — superadmin-only for now.
- Alerting / email-on-error, error grouping/counts ("this happened 40×"), charts/trends.
- Capturing 4xx (validation, 401, 404) — noisy; 5xx + browser crashes only to start.
- Search box, pagination (small N for the alpha; a simple newest-N limit covers it).
- Wiring the same rows into the existing `logs/` run-transcript tooling.
