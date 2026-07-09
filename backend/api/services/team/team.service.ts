// The people-aliases service (pre-go-live PG9). Owns the merge/rename rules over a
// manager's alias sidecar; the repo just stores the shape. Keys are the same normalized
// (trim + lower-case) person key the client groups on, so a merge here folds two Team
// cards into one there. Fenced by userId at the controller — this layer never crosses users.

import { fileTeamRepo, teamRepo } from "./team.repo.ts";
import type { TeamRepo, PeopleAliases } from "./team.repo.ts";
import { badRequest } from "../../middleware/http-error.ts";

const NAME_CAP = 80;

const normalizeKey = (s: unknown): string => String(s ?? "").trim().toLowerCase();

export interface TeamService {
  getAliases(userId: string): Promise<PeopleAliases>;
  /** Fold `from` into `into` (both normalized keys). Collapses chains; rejects a self/cycle merge. */
  merge(userId: string, from: unknown, into: unknown): Promise<PeopleAliases>;
  /** Set (or clear, when blank) the display name for a person key. */
  rename(userId: string, key: unknown, name: unknown): Promise<PeopleAliases>;
}

/** Follow the merge chain to the canonical key (guarded against loops). */
function resolve(merges: Record<string, string>, key: string): string {
  let k = key;
  const seen = new Set<string>();
  for (;;) {
    const next = merges[k];
    if (!next || seen.has(k)) return k;
    seen.add(k);
    k = next;
  }
}

export function createTeamService(repo: TeamRepo = fileTeamRepo): TeamService {
  return {
    getAliases(userId) {
      return repo.read(userId);
    },

    async merge(userId, fromRaw, intoRaw) {
      const from = normalizeKey(fromRaw);
      const into = normalizeKey(intoRaw);
      if (!from || !into) throw badRequest("from and into are required");
      if (from === into) throw badRequest("cannot merge a person into themselves");

      const data = await repo.read(userId);
      const canonicalInto = resolve(data.merges, into);
      if (canonicalInto === from) throw badRequest("that merge would create a loop");

      data.merges[from] = canonicalInto;
      // Re-point anyone already folded into `from` so chains collapse to one canonical key.
      for (const k of Object.keys(data.merges)) {
        if (k !== from && data.merges[k] === from) data.merges[k] = canonicalInto;
      }
      // `from` is no longer a canonical person — drop any display name it carried.
      delete data.names[from];

      await repo.write(userId, data);
      return data;
    },

    async rename(userId, keyRaw, nameRaw) {
      const key = normalizeKey(keyRaw);
      if (!key) throw badRequest("key is required");
      const name = String(nameRaw ?? "").trim().slice(0, NAME_CAP);

      const data = await repo.read(userId);
      const canonical = resolve(data.merges, key);
      if (name) data.names[canonical] = name;
      else delete data.names[canonical]; // blank clears the override, back to the auto name

      await repo.write(userId, data);
      return data;
    },
  };
}

export const teamService = createTeamService(teamRepo);
