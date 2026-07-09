// Storage seam for a manager's people-aliases (pre-go-live PG9). The auto-built Team keys
// people on a normalized name; this per-manager record holds the two explicit overrides
// on top of that: `merges` (one person's key folds into another's) and `names` (a display
// name for a person). Postgres row per manager (postgres-runtime-data Phase 5) with the
// old per-manager JSON file kept as the echo/rollback; fenced by userId either way.
// Personal data — the file dir stays git-ignored.

import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { DATA_DIR } from "../../../engine/paths.mts";
import { getDb, hasDatabaseUrl } from "../../../db/client.ts";
import { peopleAliases } from "../../../db/schema.ts";
import { shouldEchoToDisk } from "../../../db/run-artifacts-store.ts";

/** merges: normalizedKey → canonicalKey · names: canonicalKey → display name. */
export interface PeopleAliases {
  merges: Record<string, string>;
  names: Record<string, string>;
}

export interface TeamRepo {
  read(userId: string): Promise<PeopleAliases>;
  write(userId: string, data: PeopleAliases): Promise<void>;
}

const ALIASES_DIR = path.join(DATA_DIR, "people-aliases");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fileFor(userId: string): string {
  const safe = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_") || "unknown";
  return path.join(ALIASES_DIR, `${safe}.json`);
}

function empty(): PeopleAliases {
  return { merges: {}, names: {} };
}

function shape(raw: unknown): PeopleAliases {
  const r = raw as Partial<PeopleAliases> | null;
  return {
    merges: r && typeof r.merges === "object" && r.merges ? r.merges : {},
    names: r && typeof r.names === "object" && r.names ? r.names : {},
  };
}

function readFile(userId: string): PeopleAliases {
  try {
    return shape(JSON.parse(fs.readFileSync(fileFor(userId), "utf8")));
  } catch {
    return empty(); // no file yet (or unreadable) → no overrides
  }
}

function writeFile(userId: string, data: PeopleAliases): void {
  fs.mkdirSync(ALIASES_DIR, { recursive: true });
  const file = fileFor(userId);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file); // atomic — never a half-written aliases file
}

export const fileTeamRepo: TeamRepo = {
  async read(userId) {
    return readFile(userId);
  },
  async write(userId, data) {
    writeFile(userId, data);
  },
};

// people_aliases.user_id is a uuid FK to users — the dev side-door's synthetic
// "dev-user" can't have a row, so non-uuid callers stay on the file store (the
// same data they always had).
export const pgTeamRepo: TeamRepo = {
  async read(userId) {
    if (!UUID_RE.test(userId)) return readFile(userId);
    const rows = await getDb()
      .select({ doc: peopleAliases.doc })
      .from(peopleAliases)
      .where(eq(peopleAliases.userId, userId))
      .limit(1);
    const row = rows[0];
    return row ? shape(row.doc) : empty();
  },
  async write(userId, data) {
    if (!UUID_RE.test(userId)) {
      writeFile(userId, data);
      return;
    }
    await getDb()
      .insert(peopleAliases)
      .values({ userId, doc: data })
      .onConflictDoUpdate({ target: peopleAliases.userId, set: { doc: data, updatedAt: new Date() } });
    if (shouldEchoToDisk()) writeFile(userId, data); // rollback stays intact
  },
};

export const teamRepo: TeamRepo = hasDatabaseUrl() ? pgTeamRepo : fileTeamRepo;
