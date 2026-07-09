// The Postgres store + boot-hydrated cache for role profiles — the cached
// per-(role, seniority) LLM context and the manager's word overlay
// (postgres-runtime-data Phase 5). Reads sit on the engine hot path
// (question-generator / planner / eval), so they stay synchronous against the
// cache; writes are cache + queued upsert with the JSON files kept as the echo.
//
// Hydration SELF-MIGRATES disk-only profiles/overlays (pre-cutover cache files)
// into the database, so no regeneration — and no extra LLM spend — is ever
// triggered by the cutover. The cache-hit test in role-profile guards that.

import fs from "node:fs";
import path from "node:path";
import { getDb, hasDatabaseUrl } from "./client.ts";
import { roleProfiles } from "./schema.ts";
import { isObjectRecord } from "../shared/guards.ts";

interface Entry {
  doc: Record<string, unknown>;
  overlay: Record<string, unknown> | null;
}

let hydrated = false;
const cache = new Map<string, Entry>();

function requireHydrated(): void {
  if (!hydrated) {
    throw new Error(
      "role-profile cache not hydrated — await hydrateRoleProfiles() at boot (postgres-runtime-data Phase 5)",
    );
  }
}

interface HydrateOpts {
  loadRows?: () => Promise<Array<{ cacheKey: string; doc: unknown; overlay: unknown }>>;
  diskEntries?: () => Map<string, Entry>;
}

function scanDisk(profilesDir: string): Map<string, Entry> {
  const out = new Map<string, Entry>();
  let files: string[];
  try {
    files = fs.readdirSync(profilesDir);
  } catch {
    return out;
  }
  const readJson = (f: string): unknown => {
    try {
      return JSON.parse(fs.readFileSync(path.join(profilesDir, f), "utf8"));
    } catch {
      return null;
    }
  };
  for (const f of files) {
    if (!f.endsWith(".json") || f.endsWith(".overlay.json")) continue;
    const doc = readJson(f);
    if (!isObjectRecord(doc)) continue;
    const key = f.replace(/\.json$/, "");
    const overlayRaw = readJson(`${key}.overlay.json`);
    out.set(key, { doc, overlay: isObjectRecord(overlayRaw) ? overlayRaw : null });
  }
  return out;
}

/** Load role profiles into memory; DB rows win, disk-only entries self-migrate. */
export async function hydrateRoleProfiles(profilesDir: string, opts: HydrateOpts = {}): Promise<void> {
  const rows = await (opts.loadRows ??
    (async () =>
      getDb()
        .select({ cacheKey: roleProfiles.cacheKey, doc: roleProfiles.doc, overlay: roleProfiles.overlay })
        .from(roleProfiles)))();
  const disk = opts.diskEntries ? opts.diskEntries() : scanDisk(profilesDir);
  cache.clear();
  for (const row of rows) {
    if (!isObjectRecord(row.doc)) continue;
    cache.set(row.cacheKey, { doc: row.doc, overlay: isObjectRecord(row.overlay) ? row.overlay : null });
  }
  for (const [key, entry] of disk) {
    if (cache.has(key)) continue; // DB wins over the echo
    cache.set(key, entry);
    queueUpsert(key, entry.doc, entry.overlay); // self-migrate: no regeneration, no LLM spend
  }
  hydrated = true;
}

export function isRoleProfilesHydrated(): boolean {
  return hydrated;
}

/** Tests only. */
export function resetRoleProfiles(): void {
  hydrated = false;
  cache.clear();
}

export function roleProfileGet(key: string): Record<string, unknown> | null {
  requireHydrated();
  return cache.get(key)?.doc ?? null;
}

export function roleProfileHas(key: string): boolean {
  requireHydrated();
  return cache.has(key);
}

export function roleProfileList(): Array<{ key: string; doc: Record<string, unknown> }> {
  requireHydrated();
  return [...cache.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, e]) => ({ key, doc: e.doc }));
}

export function roleProfileOverlayGet(key: string): Record<string, unknown> | null {
  requireHydrated();
  return cache.get(key)?.overlay ?? null;
}

let chain: Promise<unknown> = Promise.resolve();

function queueUpsert(key: string, doc: Record<string, unknown>, overlay: Record<string, unknown> | null): void {
  if (!hasDatabaseUrl()) return;
  chain = chain
    .then(() =>
      getDb()
        .insert(roleProfiles)
        .values({ cacheKey: key, doc, overlay })
        .onConflictDoUpdate({ target: roleProfiles.cacheKey, set: { doc, overlay, updatedAt: new Date() } }),
    )
    .catch((e) => console.warn(`[role-profiles] write failed (${key}):`, e instanceof Error ? e.message : String(e)));
}

export function roleProfileSaveDoc(key: string, doc: Record<string, unknown>): void {
  requireHydrated();
  const overlay = cache.get(key)?.overlay ?? null;
  cache.set(key, { doc, overlay });
  queueUpsert(key, doc, overlay);
}

/** The overlay rides on the profile row — saving one requires the profile to
 *  exist (mirrors the file store's existsSync guard on mutations). */
export function roleProfileSaveOverlay(key: string, overlay: Record<string, unknown>): void {
  requireHydrated();
  const entry = cache.get(key);
  if (!entry) throw Object.assign(new Error("Unknown role"), { status: 404 });
  entry.overlay = overlay;
  queueUpsert(key, entry.doc, overlay);
}

/** Wait for queued writes to settle (shares the boot/exit flush points). */
export async function flushRoleProfileWrites(): Promise<void> {
  await chain;
}
