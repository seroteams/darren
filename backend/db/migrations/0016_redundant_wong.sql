CREATE TYPE "public"."tracker_kind" AS ENUM('promise', 'request', 'goal');--> statement-breakpoint
CREATE TABLE "tracker_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"kind" "tracker_kind" NOT NULL,
	"text" text NOT NULL,
	"owner" text,
	"category" text,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"history" jsonb NOT NULL,
	"created_session_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracker_items" ADD CONSTRAINT "tracker_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_items" ADD CONSTRAINT "tracker_items_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_items" ADD CONSTRAINT "tracker_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_items" ADD CONSTRAINT "tracker_items_created_session_id_guided_sessions_id_fk" FOREIGN KEY ("created_session_id") REFERENCES "public"."guided_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracker_items_org_id_idx" ON "tracker_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tracker_items_person_id_idx" ON "tracker_items" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "tracker_items_person_kind_status_idx" ON "tracker_items" USING btree ("person_id","kind","status");