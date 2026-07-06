ALTER TABLE "invitations" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "person_id" uuid;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;