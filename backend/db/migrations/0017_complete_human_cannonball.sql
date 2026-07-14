CREATE TYPE "public"."score_block" AS ENUM('tasks', 'processes', 'team', 'development', 'fun', 'fulfilment');--> statement-breakpoint
CREATE TABLE "block_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"guided_session_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"block" "score_block" NOT NULL,
	"score" numeric(3, 1) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "block_scores" ADD CONSTRAINT "block_scores_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_scores" ADD CONSTRAINT "block_scores_guided_session_id_guided_sessions_id_fk" FOREIGN KEY ("guided_session_id") REFERENCES "public"."guided_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_scores" ADD CONSTRAINT "block_scores_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "block_scores_session_block_unique" ON "block_scores" USING btree ("guided_session_id","block");--> statement-breakpoint
CREATE INDEX "block_scores_person_id_idx" ON "block_scores" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "block_scores_org_id_idx" ON "block_scores" USING btree ("org_id");