# Phase 0 — Baseline + schema check

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Lock the facts and choices the build depends on — before any code or migration. The output is a written go/no-go in PLAN.md, nothing else.

## Why
Phase 1 adds a database table and a live migration to Neon. Phases 2–4 promise "newest first," "mark resolved," and "auto-purge." Those only hold if the schema and migration path support them. Confirm first, assume nothing — the same discipline that caught the runs-nullability question in user-management.

## Changes (all read-only / written notes — no code)
- **Storage choice — record it:** database table `error_logs` (settled with Carl, under the going-live lens). Note it in PLAN.md so it isn't re-litigated.
- **Production persistence — confirm + record:** name the live **hosting target** and confirm the split it depends on — the **Neon database persists** across deploys/restarts; the **app's local disk does not** (wiped on deploy on most hosts). This is the whole reason the log goes in the DB, not a file — write it down. While here, record the follow-up flag: the existing audit log, feedback, and run logs write to local disk and carry the same risk once hosted (tracked in PLAN.md "Parked," not fixed here).
- **Migration path:** confirm how a new table reaches live — `npm run db:generate` writes SQL into [backend/db/migrations/](../../../backend/db/migrations/), and how it was applied to Neon last time (the roles migration `0003` is the precedent). Write down the exact command sequence Phase 1 will use.
- **Lock the columns:** confirm the proposed `error_logs` shape against the schema rules at the top of [backend/db/schema.ts](../../../backend/db/schema.ts) (uuid PK, snake_case, timestamptz, jsonb, indexed org_id). Note the one deviation: `org_id` and `user_id` are **nullable** here (anonymous / pre-login errors have neither). Proposed columns:
  `id` · `org_id?` · `user_id?` · `email?` · `environment` (`local`|`production`) · `source` (`api`|`browser`) · `method?` · `path` · `status?` · `error_code?` · `message` · `details?` (jsonb) · `resolved_at?` · `created_at`.
- **Environment tag — how it's set (Carl's requirement):** every row records where it was made — Carl's **local** dev vs the **published / live** Sero — so a single log in one Neon shows both, filterable. Detect it from an env var (`APP_ENV` / `SERO_ENV`), defaulting to `production` when `NODE_ENV=production` (the `start` / hosted script) and `local` otherwise (the `dev` script). Lock the exact signal here; Phase 1 wires it.
- **Capture scope:** confirm 5xx-only for the backend (skip 4xx noise) and "browser crashes + failed loads" for the frontend. Write it down.
- **Secret-safety rule:** confirm what we store — identity + route + message + stack only; **never** a request body, password, token, or cookie (same rule as the audit writer). Write it down.
- Record all of the above in PLAN.md "Current state" as the go/no-go.

## Not in this phase
- Any table, migration, route, or UI. No `npm run db:generate` yet — Phase 1 runs it.

## Done when
- [ ] Hosting target named, and production persistence confirmed in writing (Neon survives deploys; app disk does not) — with the existing-local-logs follow-up flagged.
- [ ] Migration command sequence for Phase 1 is written down (generate → apply-to-Neon), matching how `0003` was applied.
- [ ] The `error_logs` column list is confirmed against the schema rules and written down, with the nullable `org_id`/`user_id` note.
- [ ] Capture scope (5xx + browser crashes) and the secret-safety rule are written down.
- [ ] Go/no-go recorded in PLAN.md.
- [ ] Product owner has read the findings and said go.

## Test scenarios — for the product owner
Walk through these yourself. Phase 1 waits for your green light.
1. **The plan is concrete, not hand-wavy** — read the Phase 0 findings in PLAN.md. The "how the table reaches live" step and the "what we will and won't store" answer are stated plainly. ❌ Not OK if either is still "we'll figure it out."
2. **No surprises for you** — the column list matches the screen you saw (When/Who/Where/What/Status all have a home). ❌ Not OK if a column on the mockup has nowhere to come from.
