// The live/local safety catch (postgres-runtime-data Phase 1). The database itself
// remembers which environment it belongs to (app_state row key "environment",
// written on first boot) — and every boot compares that against this process's
// APP_ENV. On mismatch the process refuses to start, so a copied .env can never
// point a local dev app at the live database. Env-file discipline alone can't
// give that guarantee; the DB asserting its own identity can.
//
// ALLOW_ENV_MISMATCH=1 is the one deliberate escape hatch — reserved for the
// Phase 6 backfill script, where importing local files INTO the live DB is the
// whole point.

import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "./client.ts";
import { appState } from "./schema.ts";

export type AppEnv = "local" | "live";

const ENVIRONMENT_KEY = "environment";

/** This process's environment: APP_ENV ("local" | "live") wins; unset falls back
 *  to NODE_ENV (production → live). An unknown value refuses loudly — a typo'd
 *  APP_ENV silently defaulting is exactly the accident this module exists to stop. */
export function resolveAppEnv(): AppEnv {
  const raw = process.env.APP_ENV?.trim().toLowerCase();
  if (raw === "live") return "live";
  if (raw === "local") return "local";
  if (raw) {
    throw new Error(
      `APP_ENV is set to "${raw}" but must be "local" or "live". Fix it in your .env (see .env.example).`,
    );
  }
  return process.env.NODE_ENV === "production" ? "live" : "local";
}

export type EnvGuardDecision =
  | { action: "claim" }
  | { action: "ok" }
  | { action: "allowed-mismatch" }
  | { action: "mismatch"; message: string };

/** The pure decision: what to do given this app's env and what the DB says it is.
 *  Kept free of I/O so the rule is provable without a database. */
export function evaluateEnvGuard(input: {
  appEnv: AppEnv;
  dbEnv: string | null;
  allowMismatch: boolean;
}): EnvGuardDecision {
  const { appEnv, dbEnv, allowMismatch } = input;
  if (dbEnv == null) return { action: "claim" };
  if (dbEnv === appEnv) return { action: "ok" };
  if (allowMismatch) return { action: "allowed-mismatch" };
  return {
    action: "mismatch",
    message:
      `This database says it belongs to the "${dbEnv}" environment, but this app is running as "${appEnv}". ` +
      `Refusing to start so a local app can never touch live data. ` +
      `Check DATABASE_URL and APP_ENV in your .env (see .env.example) — they must point at the same environment.`,
  };
}

/** Thrown on a refused mismatch — callers print .message and exit(1). */
export class EnvGuardError extends Error {}

/** Read (or claim) the DB's environment marker and enforce the guard. No-op in
 *  file mode (no DATABASE_URL). Throws EnvGuardError on a refused mismatch, or a
 *  plain Error with a "run npm run db:migrate" hint when the schema is behind
 *  (the CLI doesn't auto-migrate; the server migrates before calling this). */
export async function runEnvironmentGuard(): Promise<{ skipped: boolean; appEnv?: AppEnv }> {
  if (!hasDatabaseUrl()) return { skipped: true };
  const appEnv = resolveAppEnv();
  const allowMismatch = process.env.ALLOW_ENV_MISMATCH === "1";

  let dbEnv: string | null;
  try {
    const rows = await getDb().select().from(appState).where(eq(appState.key, ENVIRONMENT_KEY)).limit(1);
    const value = rows[0]?.value;
    dbEnv = typeof value === "string" ? value : null;
  } catch (e) {
    if (isMissingTable(e)) {
      throw new Error(
        "The database schema is behind (no app_state table). Run `npm run db:migrate` and try again.",
      );
    }
    throw e;
  }

  const decision = evaluateEnvGuard({ appEnv, dbEnv, allowMismatch });
  switch (decision.action) {
    case "claim":
      await getDb()
        .insert(appState)
        .values({ key: ENVIRONMENT_KEY, value: appEnv })
        .onConflictDoNothing();
      console.log(`[env-guard] database claimed for the "${appEnv}" environment`);
      return { skipped: false, appEnv };
    case "ok":
      return { skipped: false, appEnv };
    case "allowed-mismatch":
      console.warn(
        `[env-guard] WARNING: environment mismatch allowed by ALLOW_ENV_MISMATCH=1 (app "${appEnv}", db "${dbEnv}").`,
      );
      return { skipped: false, appEnv };
    case "mismatch":
      throw new EnvGuardError(decision.message);
  }
}

/** Postgres "relation does not exist" (42P01) — the schema hasn't been migrated. */
function isMissingTable(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "42P01";
}
