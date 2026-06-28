// Drizzle-kit config: where the schema lives, where generated migrations go, and how
// to reach Postgres. `npm run db:generate` reads this to diff the schema → a new SQL
// migration (offline, no DB needed). `npm run db:migrate` reads it to apply pending
// migrations to the DATABASE_URL (used live in Phase 4). The placeholder url is only
// a fallback so `generate` runs with no env set; `migrate` needs a real DATABASE_URL.

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./backend/db/schema.ts",
  out: "./backend/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://sero:sero@localhost:5432/sero",
  },
});
