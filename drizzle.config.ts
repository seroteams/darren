// Drizzle-kit config: where the schema lives, where generated migrations go, and how
// to reach Postgres. `npm run db:generate` reads this to diff the schema → a new SQL
// migration (offline, no DB needed). `npm run db:migrate` reads it to apply pending
// migrations to the DATABASE_URL (used live in Phase 4). The placeholder url is only
// a fallback so `generate` runs with no env set; `migrate` needs a real DATABASE_URL.

import { defineConfig } from "drizzle-kit";

// Load DATABASE_URL from the repo-root .env (gitignored). cwd is the repo root
// under npm scripts, so the no-arg form resolves ./.env; the try/catch makes a
// missing .env a no-op (db:generate works offline with the placeholder below).
try {
  process.loadEnvFile();
} catch {
  /* no .env present — fine for offline `db:generate` */
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./backend/db/schema.ts",
  out: "./backend/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://sero:sero@localhost:5432/sero",
  },
});
