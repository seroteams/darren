CREATE TABLE "guided_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"person_name" text NOT NULL,
	"stage" text DEFAULT 'catchup' NOT NULL,
	"state" jsonb NOT NULL,
	"engagement" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "guided_sessions" ADD CONSTRAINT "guided_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_sessions" ADD CONSTRAINT "guided_sessions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_sessions" ADD CONSTRAINT "guided_sessions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guided_sessions_org_id_idx" ON "guided_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "guided_sessions_manager_id_idx" ON "guided_sessions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "guided_sessions_person_id_idx" ON "guided_sessions" USING btree ("person_id");