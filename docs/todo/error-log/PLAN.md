# Error log

**Goal:** A single **Error log** screen where you (superadmin) can see every error any user hits — across every company, newest first — so when someone says "it broke," you go in and see exactly what happened: who, where, what, when.
**Driver:** Carl
**Created:** 2026-07-05

## Done means
- A new **Error log** page in the admin nav (superadmin-only, like User management).
- A clean **table**: When · Who (name + company) · Where (screen/route) · What went wrong · Status — newest first.
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
| 0 | Baseline + schema check | Read-only: confirm DB/migration path, lock the `error_logs` columns + capture scope, baseline `npm test` — go/no-go | 🔨 |
| 1 | Store + catch backend errors | `error_logs` table + migration; write one row on every API 5xx at `v1Route` (+ legacy router). Redacts secrets, never blocks the response | ⬜ |
| 2 | The Error log screen | Superadmin-only page + nav item (mirrors User management); read endpoint; the table, newest first | ⬜ |
| 3 | Catch browser errors too | Global crash handler + failed-fetch reporter in the app → blank-screen crashes + failed loads land in the log, tagged with the screen | ⬜ |
| 4 | Detail + tidy-up | Row-click detail (stack, request info); filters + "mark resolved"; auto-purge old rows | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 0 running (2026-07-05) — technical facts confirmed; awaiting Carl's hosting answer + read-and-go to close it.** No code written. **Baseline (free, before touching anything): `npm test` 62/62 green**, typecheck clean.

**Phase 0 findings — the go/no-go:**
- **Migration path — confirmed** (via [drizzle.config.ts](../../../drizzle.config.ts) + the `0003` precedent that reached live Neon). Phase 1 sequence: edit [schema.ts](../../../backend/db/schema.ts) → `npm run db:generate` (writes `0004_*.sql` **offline, no DB touched**) → review the SQL → `npm run db:migrate` (applies to live Neon via `DATABASE_URL`). `db:generate` auto-writes the `CREATE TABLE` — no hand-editing needed (unlike 0003's semantic rename).
- **Columns locked** against the schema's own rules (uuid PK · snake_case · timestamptz · jsonb · FK+index on every `*_id`): `id · org_id? · user_id? · email? · source(enum api|browser) · method? · path · status?(int) · error_code? · message · details?(jsonb) · resolved_at? · created_at`, plus an index on `created_at` (newest-first + purge cutoff). **One documented deviation:** `org_id`/`user_id` are **nullable** (every other table has `org_id NOT NULL`) — required so anonymous / pre-login errors still record.
- **Capture scope — confirmed:** backend 5xx at the existing catch points ([v1-route.ts](../../../backend/api/middleware/v1-route.ts) + legacy [router.ts](../../../backend/api/router.ts)); browser crashes / failed loads in Phase 3. No 4xx (parked).
- **Secret-safety — confirmed:** store identity (userId/orgId/email from `RequestContext`) + method + path + status + code + message + stack only — never a request body, password, token, or cookie. The existing `console.error` stays as the DB-down backstop.
- **Open — needs Carl:** name the live **hosting target** (confirms the app-disk-gets-wiped assumption + lets us flag the other file-based logs). Then his read + "go" closes Phase 0 → commit + STATUS/board update, then Phase 1.

**Parallel track:** [user-management](../user-management/PLAN.md) Phase 2 is still open; Carl chose to run this alongside it.

## Parked
- **⚠️ Follow-up flagged (NOT this plan):** the existing **audit log, feedback, and run logs** all write to **local disk** (`content/data/…`). Same wipe-on-deploy risk once Sero is hosted — worth moving to the DB (or persistent storage) before real customers. Raised 2026-07-05 during this decision; belongs in the going-live track, not here.
- **Per-manager "your team's errors" view** (customer-facing) — superadmin-only for now.
- Alerting / email-on-error, error grouping/counts ("this happened 40×"), charts/trends.
- Capturing 4xx (validation, 401, 404) — noisy; 5xx + browser crashes only to start.
- Search box, pagination (small N for the alpha; a simple newest-N limit covers it).
- Wiring the same rows into the existing `logs/` run-transcript tooling.
