-- guided_sessions.person_name (monthly-one-on-one Phase 1) — denormalised person name
-- for the finished-session lists. Idempotent (IF NOT EXISTS) for the same reason as
-- 0015: the boot migrator + test harness both apply migrations, and a parallel session
-- may already have added the column to the shared local DB. The table is empty at this
-- point, so a NOT NULL add needs no default/backfill.
ALTER TABLE "guided_sessions" ADD COLUMN IF NOT EXISTS "person_name" text NOT NULL;
