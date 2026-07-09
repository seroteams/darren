-- Alignment probe (database-sync live/local test): plant one visible, harmless marker
-- row in whichever database applies this migration. Local gets it on the next boot /
-- `npm run db:migrate`; live gets it when the deploy boots. `scripts/db-alignment-check.ts`
-- then proves the same change reached BOTH databases.
INSERT INTO "app_state" ("key", "value", "updated_at")
VALUES ('alignment_probe', jsonb_build_object('migration', '0012_alignment_probe', 'applied_at', now()), now())
ON CONFLICT ("key") DO UPDATE SET "value" = excluded."value", "updated_at" = now();
