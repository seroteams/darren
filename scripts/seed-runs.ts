// Dev-only seed: give the member account we test with a set of finished 1:1 runs so the
// Runs screen (member) and the Library (admin) have realistic data to look at — without
// paying for generation. Every run is CLONED from an already-finished run on disk (its
// briefing is copied verbatim), so this is free: local filesystem only, no OpenAI. Refuses
// to run in production.
//
// Attaches the runs to member@seroteams.com (override via SEED_RUNS_EMAIL). Because the
// member shares Carl's org, the same runs also show up in the admin Library.
//
//   node scripts/seed-runs.ts

import "../backend/api/env-boot.ts"; // load .env (DATABASE_URL) before the db client reads it
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, closeDb, hasDatabaseUrl } from "../backend/db/client.ts";
import { users, runArtifacts } from "../backend/db/schema.ts";
import { createSession } from "../backend/engine/session.ts";
import { findRunDir } from "../backend/engine/run-history.ts";
import { upsertSession } from "../backend/db/sessions-store.ts";
import { hydrateSession } from "../backend/api/session-persistence.ts";
import type { PersistedSession } from "../backend/api/session-persistence.ts";

const EMAIL = process.env.SEED_RUNS_EMAIL || "member@seroteams.com";
const STATE_FILE = "session-state.json";
const DAY = 24 * 60 * 60 * 1000;

// Curated finished source runs to clone, each a distinct person / role / meeting type, and
// how many days ago it should appear to have happened (so the list reads like a real history,
// newest first). ctx + briefing are kept verbatim from the source, so the row and the detail
// view stay in sync.
const SOURCES: Array<{ id: string; daysAgo: number }> = [
  { id: "2026_Jun06_09-49-f9226a88", daysAgo: 2 },  // Grace  · Product Design Lead · Growth & career plan
  { id: "2026_Jun06_09-55-eff71e0a", daysAgo: 4 },  // Daniel · Lead Product Designer · Performance & feedback
  { id: "2026_Jun06_09-51-dc007466", daysAgo: 6 },  // Marcus · Customer Success Manager · Something feels off
  { id: "2026_Jun06_09-50-cafd52e3", daysAgo: 9 },  // Nina   · Content Designer · Performance & feedback
  { id: "2026_Jun06_09-47-ca22707c", daysAgo: 12 }, // Sofia  · Product Designer · Bi-weekly check-in
  { id: "2026_Jun03_23-14-e0148d67", daysAgo: 15 }, // Samira · Service Designer · Bi-weekly check-in
];

function readState(dir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, STATE_FILE), "utf8"));
  } catch {
    return null;
  }
}

/** Copy a source run's stage artifacts to the new session id, so the seeded run's
 *  detail tabs render from the DB like a real run. No-op when the source has none. */
async function cloneArtifacts(fromKey: string, toKey: string, orgId: string | null): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(runArtifacts).where(eq(runArtifacts.sessionKey, fromKey));
  if (!rows.length) return;
  await db
    .insert(runArtifacts)
    .values(
      rows.map((r) => ({
        sessionKey: toKey,
        orgId,
        stage: r.stage,
        name: r.name,
        kind: r.kind,
        content: r.content,
        contentText: r.contentText,
      })),
    )
    .onConflictDoNothing();
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed-runs is a dev helper — refusing to run in production.");
  }
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not set — start your local Postgres / .env first.");
  }

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  const member = rows[0];
  if (!member) {
    throw new Error(`No user ${EMAIL} — run scripts/seed-member.ts first.`);
  }
  const { orgId, id: userId } = member;
  console.log(`Seeding runs for ${EMAIL} (user ${userId}, org ${orgId}).\n`);

  const now = Date.now();
  let made = 0;
  for (const src of SOURCES) {
    const srcDir = findRunDir(src.id); // unfenced lookup (dev helper)
    if (!srcDir) {
      console.warn(`  skip ${src.id} — source not found on disk`);
      continue;
    }
    const source = readState(srcDir);
    if (!source || !source.briefing) {
      console.warn(`  skip ${src.id} — source has no briefing (not finished)`);
      continue;
    }

    const { id, dir } = createSession();       // fresh id + dir for the run's log_dir reference
    const when = now - src.daysAgo * DAY;
    const cloned = {
      ...source,
      id,
      dir,
      orgId,
      userId,
      createdAt: when,
      lastSeenAt: when,
      completedAt: when,
      runLabel: "seed",
    };
    // P7: seed straight into the DATABASE (the app reads runs from Postgres now) — the
    // session row + its briefing (in state), plus a copy of the source run's stage
    // artifacts under the new id so the detail tabs render. No disk state-file / folder.
    await upsertSession(hydrateSession(cloned as unknown as PersistedSession, dir));
    await cloneArtifacts(src.id, id, orgId);

    const c = (source.ctx || {}) as Record<string, string>;
    console.log(`  + ${[c.name, c.role, c.meetingType].filter(Boolean).join(" · ")}  (${src.daysAgo}d ago)`);
    made += 1;
  }

  console.log(`\nDone — seeded ${made} run(s). They appear in the member's Runs and the admin Library.`);
  await closeDb();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
