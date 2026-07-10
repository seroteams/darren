ALTER TABLE "feedback_notes" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "feedback_notes" ADD COLUMN "verdict" text;--> statement-breakpoint
CREATE INDEX "feedback_notes_run_id_idx" ON "feedback_notes" USING btree ("run_id");