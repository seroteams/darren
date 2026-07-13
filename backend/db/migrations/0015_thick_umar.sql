-- guided_sessions (monthly-one-on-one Phase 1). Written idempotent (IF NOT EXISTS +
-- duplicate-safe constraints) so a re-run is a no-op: the boot migrator + the
-- test harness both apply migrations, and a process killed between the DDL and the
-- ledger write (Neon pooler / harness server-kill) would otherwise leave an orphan
-- table that permanently blocks every later migrate. Re-runnable DDL avoids that.
CREATE TABLE IF NOT EXISTS "guided_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"stage" text DEFAULT 'catchup' NOT NULL,
	"state" jsonb NOT NULL,
	"engagement" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "guided_sessions" ADD CONSTRAINT "guided_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "guided_sessions" ADD CONSTRAINT "guided_sessions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "guided_sessions" ADD CONSTRAINT "guided_sessions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guided_sessions_org_id_idx" ON "guided_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guided_sessions_manager_id_idx" ON "guided_sessions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guided_sessions_person_id_idx" ON "guided_sessions" USING btree ("person_id");
