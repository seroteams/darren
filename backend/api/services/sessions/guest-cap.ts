// The guest daily cap (guest-run Phase 1). Anonymous session starts spend real
// OpenAI money, so they're budgeted: at most GUEST_RUNS_PER_DAY starts per UTC day
// across ALL guests (default 10), on top of the per-IP rate limit in server.ts.
// File-backed ({date, count} json) so a server restart never hands out a fresh
// budget. Logged-in starts never pass through here.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { rateLimited } from "../../middleware/http-error.ts";

export const GUEST_CAP_MESSAGE = "Today's free tries are used up — please come back tomorrow.";

const DEFAULT_LIMIT = 10;

export interface GuestCap {
  // Spend one guest start from today's budget, or throw 429 with the plain message.
  take(): void;
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

function readState(file: string, today: string): CapState {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<CapState>;
    if (parsed && parsed.date === today && typeof parsed.count === "number") {
      return { date: today, count: parsed.count };
    }
  } catch {
    // Missing or corrupt counter file — treat as an empty day, never crash a start.
  }
  return { date: today, count: 0 };
}

export function createGuestCap(opts: { file: string; limit?: number; now?: () => number }): GuestCap {
  const now = opts.now ?? Date.now;
  return {
    take() {
      const today = utcDay(now());
      const state = readState(opts.file, today);
      if (state.count >= resolveLimit(opts.limit)) throw rateLimited(GUEST_CAP_MESSAGE);
      mkdirSync(dirname(opts.file), { recursive: true });
      writeFileSync(opts.file, JSON.stringify({ date: today, count: state.count + 1 }));
    },
  };
}

// The one live instance — counter beside the other file-backed data stores.
export const guestCap: GuestCap = createGuestCap({
  file: join(process.cwd(), "content", "data", "guest-cap.json"),
});
