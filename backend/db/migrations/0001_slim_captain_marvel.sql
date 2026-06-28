ALTER TABLE "sessions" ADD COLUMN "session_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_session_key_unique" UNIQUE("session_key");