// The guest daily cap (guest-run Phase 1). Anonymous session starts spend real
// OpenAI money, so they're budgeted: at most GUEST_RUNS_PER_DAY starts per UTC day
// across ALL guests (default 10), on top of the per-IP rate limit in server.ts.
// The counter lives in `app_state` (key "guest-cap") when a database is configured
// (postgres-runtime-data Phase 5) — on Render the disk is wiped per deploy, so a
// file counter would hand out a fresh budget on every release. File mode stays for
// DB-less dev and as the echo/rollback. Logged-in starts never pass through here.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { rateLimited } from "../../middleware/http-error.ts";
import { getDb, hasDatabaseUrl } from "../../../db/client.ts";
import { appState } from "../../../db/schema.ts";
import { shouldEchoToDisk } from "../../../db/run-artifacts-store.ts";

export const GUEST_CAP_MESSAGE = "Today's free tries are used up — please come back tomorrow.";

const DEFAULT_LIMIT = 10;

export interface GuestCap {
  // Spend one guest start from today's budget, or throw 429 with the plain message.
  take(): Promise<void>;
}

interface CapState {
  date: string; // UTC day, YYYY-MM-DD
  count: number;
}

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Limit resolves per take (env first, factory option as the test override) so a
// changed GUEST_RUNS_PER_DAY applies without a restart.
function resolveLimit(option?: number): number {
  if (option !== undefined) return option;
  const fromEnv = Number.parseInt(process.env.GUEST_RUNS_PER_DAY ?? "", 10);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : DEFAULT_LIMIT;
}

function shapeState(parsed: Partial<CapState> | null | undefined, today: string): CapState {
  if (parsed && parsed.date === today && typeof parsed.count === "number") {
    return { date: today, count: parsed.count };
  }
  return { date: today, count: 0 };
}

/** Where the counter lives — injectable so the DB semantics are unit-tested
 *  without a database. read tolerates a missing/corrupt record (empty day). */
export interface CapStore {
  read(): Promise<Partial<CapState> | null>;
  write(state: CapState): Promise<void>;
}

function fileCapStore(file: string): CapStore {
  return {
    async read() {
      try {
        return JSON.parse(readFileSync(file, "utf8")) as Partial<CapState>;
      } catch {
        return null; // missing or corrupt counter file — treat as an empty day
      }
    },
    async write(state) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(state));
    },
  };
}

const CAP_KEY = "guest-cap";

function pgCapStore(echoFile: string): CapStore {
  const echo = fileCapStore(echoFile);
  return {
    async read() {
      const rows = await getDb().select({ value: appState.value }).from(appState).where(eq(appState.key, CAP_KEY)).limit(1);
      return (rows[0]?.value ?? null) as Partial<CapState> | null;
    },
    async write(state) {
      await getDb()
        .insert(appState)
        .values({ key: CAP_KEY, value: state })
        .onConflictDoUpdate({ target: appState.key, set: { value: state, updatedAt: new Date() } });
      if (shouldEchoToDisk()) await echo.write(state); // rollback stays intact
    },
  };
}

export function createGuestCap(opts: { file: string; limit?: number; now?: () => number; store?: CapStore }): GuestCap {
  const now = opts.now ?? Date.now;
  const store = opts.store ?? fileCapStore(opts.file);
  return {
    async take() {
      const today = utcDay(now());
      const state = shapeState(await store.read(), today);
      if (state.count >= resolveLimit(opts.limit)) throw rateLimited(GUEST_CAP_MESSAGE);
      await store.write({ date: today, count: state.count + 1 });
    },
  };
}

// The one live instance — Postgres-backed when configured (survives Render's
// per-deploy disk wipe), file-backed otherwise.
const CAP_FILE = join(process.cwd(), "content", "data", "guest-cap.json");
export const guestCap: GuestCap = createGuestCap({
  file: CAP_FILE,
  ...(hasDatabaseUrl() ? { store: pgCapStore(CAP_FILE) } : {}),
});
