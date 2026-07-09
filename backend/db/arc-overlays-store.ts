// The Postgres store + boot-hydrated cache for arc overlays — a manager's edits
// to a 1:1 Type's arc (postgres-runtime-data Phase 5). Reads stay synchronous
// (the meeting-type registry merges overlays at read time); writes are a cache
// update plus a queued upsert/delete, with the sidecar file kept as the echo.
//
// Hydration SELF-MIGRATES: any overlay file on disk whose slug has no DB row is
// loaded into the cache AND queued for upsert — so the manager's pre-cutover
// edits survive without a separate import step.

import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "./client.ts";
import { arcOverlays } from "./schema.ts";
import { isObjectRecord } from "../shared/guards.ts";

let hydrated = false;
const cache = new Map<string, Record<string, unknown>>();

function requireHydrated(): void {
  if (!hydrated) {
    throw new Error(
      "arc-overlay cache not hydrated — await hydrateArcOverlays() at boot (postgres-runtime-data Phase 5)",
    );
  }
}

interface HydrateOpts {
  /** Injectable rows (tests run without a database). */
  loadRows?: () => Promise<Array<{ key: string; doc: unknown }>>;
  /** Injectable disk scan for the self-migration merge. */
  diskDocs?: () => Map<string, Record<string, unknown>>;
}

function scanDiskOverlays(dir: string): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      try {
        const doc: unknown = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        if (isObjectRecord(doc)) out.set(f.replace(/\.json$/, ""), doc);
      } catch {
        // unreadable overlay file — skip, never block boot
      }
    }
  } catch {
    // no overlays dir yet
  }
  return out;
}

/** Load overlays into memory; DB rows win, disk-only overlays self-migrate. */
export async function hydrateArcOverlays(overlaysDir: string, opts: HydrateOpts = {}): Promise<void> {
  const rows = await (opts.loadRows ??
    (async () => {
      const r = await getDb().select({ key: arcOverlays.key, doc: arcOverlays.doc }).from(arcOverlays);
      return r;
    }))();
  const disk = opts.diskDocs ? opts.diskDocs() : scanDiskOverlays(overlaysDir);
  cache.clear();
  for (const row of rows) {
    if (isObjectRecord(row.doc)) cache.set(row.key, row.doc);
  }
  for (const [slug, doc] of disk) {
    if (cache.has(slug)) continue; // DB wins over the echo
    cache.set(slug, doc);
    queueUpsert(slug, doc); // self-migrate the pre-cutover edit
  }
  hydrated = true;
}

export function isArcOverlaysHydrated(): boolean {
  return hydrated;
}

/** Tests only. */
export function resetArcOverlays(): void {
  hydrated = false;
  cache.clear();
}

export function arcOverlayGet(slug: string): Record<string, unknown> | null {
  requireHydrated();
  return cache.get(slug) ?? null;
}

let chain: Promise<unknown> = Promise.resolve();

function queueUpsert(slug: string, doc: Record<string, unknown>): void {
  if (!hasDatabaseUrl()) return;
  chain = chain
    .then(() =>
      getDb()
        .insert(arcOverlays)
        .values({ key: slug, doc })
        .onConflictDoUpdate({ target: arcOverlays.key, set: { doc, updatedAt: new Date() } }),
    )
    .catch((e) => console.warn(`[arc-overlays] write failed (${slug}):`, e instanceof Error ? e.message : String(e)));
}

export function arcOverlaySave(slug: string, doc: Record<string, unknown>): void {
  requireHydrated();
  cache.set(slug, doc);
  queueUpsert(slug, doc);
}

export function arcOverlayRemove(slug: string): boolean {
  requireHydrated();
  const existed = cache.delete(slug);
  if (hasDatabaseUrl()) {
    chain = chain
      .then(() => getDb().delete(arcOverlays).where(eq(arcOverlays.key, slug)))
      .catch((e) => console.warn(`[arc-overlays] delete failed (${slug}):`, e instanceof Error ? e.message : String(e)));
  }
  return existed;
}

/** Wait for queued overlay writes to settle (shares the flush points). */
export async function flushArcOverlayWrites(): Promise<void> {
  await chain;
}
