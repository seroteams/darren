// Pure alias resolution for the people backfill (people-roster Phase 3). The auto-built
// Team keys people on a normalized name; a manager can layer two overrides on top via the
// people-aliases sidecar (team.service.ts): `merges` (fold one person's key into another)
// and `names` (a display name for a key). This module answers one question with no I/O:
// given those aliases and a run's free-typed name, what single name do we file the run's
// roster person under? Keeping it pure lets it be unit-tested without a database, and keeps
// the backfill script thin. (normalizeKey + chain-walk mirror team.service's own private
// copies — deliberately not shared, so this stays free of that service's file dependencies.)

import type { PeopleAliases } from "./team.repo.ts";

/** The Team grouping key: trim + lower-case, matching team.service.ts. */
export const normalizeKey = (s: unknown): string => String(s ?? "").trim().toLowerCase();

/** Follow the manager's merge chain from a raw name to its canonical key (loop-guarded). */
export function canonicalKeyOf(aliases: PeopleAliases, rawName: unknown): string {
  const merges = aliases.merges ?? {};
  let key = normalizeKey(rawName);
  const seen = new Set<string>();
  for (;;) {
    const next = merges[key];
    if (!next || seen.has(key)) return key;
    seen.add(key);
    key = next;
  }
}

/** The display name to file this run's person under: the manager's rename override for the
 *  canonical key if one exists, else the original name when it's already canonical (keeps its
 *  casing), else the canonical key itself (a name merged away with no override). Every run
 *  resolving to the same canonical key yields the same name — the dedupe invariant the
 *  backfill leans on so one person collapses to one roster row. */
export function aliasedPersonName(aliases: PeopleAliases, rawName: string): string {
  const key = normalizeKey(rawName);
  const canonical = canonicalKeyOf(aliases, rawName);
  const override = aliases.names?.[canonical];
  if (override && override.trim()) return override.trim();
  if (canonical === key) return rawName.trim();
  return canonical;
}
