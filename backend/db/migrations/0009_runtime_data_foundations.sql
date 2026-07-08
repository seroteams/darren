CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arc_overlays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"doc" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "arc_overlays_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" text NOT NULL,
	"subdir" text DEFAULT '' NOT NULL,
	"source" text,
	"label" text,
	"stage" text,
	"doc" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_questions_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "lexicon_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_key" text NOT NULL,
	"doc" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lexicon_candidates_session_key_unique" UNIQUE("session_key")
);
--> statement-breakpoint
CREATE TABLE "people_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"doc" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_aliases_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "people_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_key" text NOT NULL,
	"markdown" text,
	"doc" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_profiles_person_key_unique" UNIQUE("person_key")
);
--> statement-breakpoint
CREATE TABLE "role_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"doc" jsonb NOT NULL,
	"overlay" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_profiles_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "run_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_key" text NOT NULL,
	"org_id" uuid,
	"stage" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"content" jsonb,
	"content_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "person_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "person_name" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "seniority" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "meeting_type" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "finished" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_seen_at" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "mode" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "persona_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "run_label" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "review" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "rating" jsonb;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people_aliases" ADD CONSTRAINT "people_aliases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_artifacts" ADD CONSTRAINT "run_artifacts_session_key_sessions_session_key_fk" FOREIGN KEY ("session_key") REFERENCES "public"."sessions"("session_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_artifacts" ADD CONSTRAINT "run_artifacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generated_questions_subdir_idx" ON "generated_questions" USING btree ("subdir");--> statement-breakpoint
CREATE UNIQUE INDEX "run_artifacts_key_stage_name_unique" ON "run_artifacts" USING btree ("session_key","stage","name");--> statement-breakpoint
CREATE INDEX "run_artifacts_session_key_idx" ON "run_artifacts" USING btree ("session_key");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_person_id_idx" ON "sessions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "sessions_finished_idx" ON "sessions" USING btree ("finished");--> statement-breakpoint
CREATE INDEX "sessions_last_seen_at_idx" ON "sessions" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "sessions_meeting_type_idx" ON "sessions" USING btree ("meeting_type");