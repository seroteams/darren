// Storage seam for a manager's people-aliases (pre-go-live PG9). The auto-built Team keys
// people on a normalized name; this per-manager sidecar records the two explicit overrides
// on top of that: `merges` (one person's key folds into another's) and `names` (a display
// name for a person). One JSON file per manager under content/data/people-aliases/, written
// atomically (temp + rename), fenced by userId. Personal data — the dir is git-ignored.
// A DB-backed impl can replace fileTeamRepo without touching the service.

import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../../../engine/paths.mts";

/** merges: normalizedKey → canonicalKey · names: canonicalKey → display name. */
export interface PeopleAliases {
  merges: Record<string, string>;
  names: Record<string, string>;
}

export interface TeamRepo {
  read(userId: string): PeopleAliases;
  write(userId: string, data: PeopleAliases): void;
}

const ALIASES_DIR = path.join(DATA_DIR, "people-aliases");

function fileFor(userId: string): string {
  const safe = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_") || "unknown";
  return path.join(ALIASES_DIR, `${safe}.json`);
}

function empty(): PeopleAliases {
  return { merges: {}, names: {} };
}

export const fileTeamRepo: TeamRepo = {
  read(userId) {
    try {
      const raw = JSON.parse(fs.readFileSync(fileFor(userId), "utf8")) as Partial<PeopleAliases>;
      return {
        merges: raw && typeof raw.merges === "object" && raw.merges ? raw.merges : {},
        names: raw && typeof raw.names === "object" && raw.names ? raw.names : {},
      };
    } catch {
      return empty(); // no file yet (or unreadable) → no overrides
    }
  },
  write(userId, data) {
    fs.mkdirSync(ALIASES_DIR, { recursive: true });
    const file = fileFor(userId);
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file); // atomic — never a half-written aliases file
  },
};
