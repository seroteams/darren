-- Rename the user_role model owner/admin/member -> admin/manager/member.
-- RENAME VALUE changes the enum label in place, so every existing 'owner' row
-- becomes 'manager' automatically (no row rewrite, transaction-safe). 'admin' and
-- 'member' already exist and are untouched. Then promote the internal owner to admin.
ALTER TYPE "public"."user_role" RENAME VALUE 'owner' TO 'manager';--> statement-breakpoint
UPDATE "users" SET "role" = 'admin' WHERE lower("email") = 'carl@seroteams.com';
