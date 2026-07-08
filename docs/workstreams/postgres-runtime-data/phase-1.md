# Phase 1 — Foundations: build the shelves + the safety catch

**Status:** 🔨 BUILT 2026-07-08 — awaiting Carl's QA walk

## Build results (2026-07-08)

- Migrations **0009** (all new tables + sessions columns) and **0010** (drop the never-written
  `runs` table) generated and **applied to the current Neon DB**. Generated in two steps on
  purpose — drizzle-kit prompts interactively when an add+drop appear in one diff.
- `run_artifacts.stage` is `NOT NULL DEFAULT ''` (not nullable): unique indexes treat NULLs
  as distinct, which would have allowed duplicate root-file rows and broken the upsert.
- `org-data.repo.ts` retargeted from the dropped `runs` table to `sessions` (it was the one
  importer; no route uses it — its fencing test is interface-based and still green).
- Boot proven live on a scratch port: `[db] migrations applied (371ms)` →
  `[env-guard] database claimed for the "local" environment` → server continues.
- Sabotage proven live: `APP_ENV=live` against the local-claimed DB → refused with the
  plain-English message, process exited 1.
- `resolveEnvironment` (error-log) already accepts `live` → maps to `production`; no change.
- Checks: `npm test` **87/87** (new: `backend/db/env-guard.test.ts`, 8 tests) ·
  `npm run typecheck` clean · **no paid runs**.

⚠️ **Note for the environment split:** the CURRENT shared Neon DB is now claimed **"local"**
(first boot came from Carl's dev machine). When the live deployment is set up, either
(a) the new second DB becomes LOCAL and this one is re-claimed LIVE (one `app_state`
update — I'll do it at that moment), or (b) this one stays local and live gets a fresh DB.
Decision lands when hosting does; the guard makes either explicit.

## Why this phase

Everything later needs somewhere to save to, and the live/local wall must exist BEFORE two
environments do — retrofitting safety after data is flowing is how accidents happen.
Zero behavior change, so it's the safest possible opener.

## What gets built

1. **Migration 0009** (`npm run db:generate` from schema changes in `backend/db/schema.ts`):
   - `sessions` extended with denormalized index columns (filled from `serialize()` at upsert):
     `user_id`, `person_id`, `person_name`, `role`, `seniority`, `meeting_type`, `stage`,
     `finished` (bool, indexed), `last_seen_at` (bigint, indexed desc), `mode`, `persona_id`,
     `run_label`, `archived_at`, `review` (jsonb), `rating` (jsonb).
   - **Drop `runs`** (defined since 0000, never written by any code — verified 2026-07-08).
   - New `run_artifacts`: id, session_key → sessions.session_key (cascade delete), org_id, stage,
     name, kind (json|text|jsonl), content (jsonb), content_text (text), timestamps.
     UNIQUE(session_key, stage, name).
   - New `generated_questions`: id, alias UNIQUE (the dedup gate), subdir ('' = pool,
     '_runtime' = run records), source/label/stage columns, doc (jsonb), created_at.
   - New small stores: `role_profiles` (cache_key unique, doc, overlay), `arc_overlays`,
     `people_profiles`, `people_aliases` (user_id unique), `lexicon_candidates`
     (session_key unique), `audit_log` (append-only), `app_state` (key/value).
2. **Boot-time migrations:** `backend/api/server.ts` runs drizzle's programmatic `migrate()`
   (from `drizzle-orm/node-postgres/migrator`) after `env-boot`, when `hasDatabaseUrl()`.
   `npm run db:migrate` stays for manual use. The CLI does NOT auto-migrate — it fails loudly
   with "run npm run db:migrate" if the schema is behind.
3. **Environment guard:** `.env` gains `APP_ENV` (`local` | `live`). On first boot the server
   writes `app_state` row `key='environment'` from `APP_ENV`; every boot (server AND CLI)
   compares and **hard-exits in plain English on mismatch** — the database asserts its own
   identity, so a copied `.env` can never write to prod. Escape hatch `ALLOW_ENV_MISMATCH=1`
   reserved for the Phase 6 backfill script only. Align `error-log.ts resolveEnvironment`.
4. **Docs:** `.env.example` updated (APP_ENV, second-DB convention); README note on creating the
   second Neon database for local dev.

## Files

`backend/db/schema.ts` · `backend/db/migrations/0009_*` (generated) · `backend/api/server.ts` ·
`backend/db/client.ts` (env-guard helper) · new `backend/db/env-guard.ts` (+ mirrored test) ·
`backend/cli.ts` (guard call) · `.env.example` · README.

## Tests (written first)

- env-guard unit tests: match → boots; mismatch → exits with the plain-English message;
  no DATABASE_URL → no-op; ALLOW_ENV_MISMATCH honored.
- Migration applies cleanly to an empty DB (integration, skips without a test DATABASE_URL).

## QA scenarios (Carl)

1. Start the app as usual — everything works exactly as before (nothing moved yet).
2. Boot log shows "migrations applied" (or "up to date").
3. Sabotage test: set `APP_ENV=live` in your local `.env` (against the dev DB that says local) —
   the server refuses to start with a clear plain-words message. Put it back to `local` — starts fine.

## Rollback

Migration is additive except dropping `runs` — which has never been written, so it's safe.
Revert the commit to undo.

## Risks

- Drizzle migrate at boot on Neon cold start adds latency — runs once, timing logged.
- `error_logs.environment` enum is `local|production` while APP_ENV is `local|live` — map
  `live` → `production` (no enum change needed).
