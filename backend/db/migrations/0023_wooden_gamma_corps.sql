ALTER TABLE "feedback_notes" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "feedback_notes" ADD COLUMN "stars" integer;--> statement-breakpoint
-- Backfill (brief-star-rating): every run-tied row that exists today is a recap verdict
-- tap, since that was the only run-tied feedback moment before this migration. Stamping
-- them now keeps the repo's (run_id, kind) upsert from matching a legacy NULL-kind row
-- and quietly turning it into a brief rating.
UPDATE "feedback_notes" SET "kind" = 'verdict' WHERE "run_id" IS NOT NULL AND "kind" IS NULL;
