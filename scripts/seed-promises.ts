// Dev-only seed: give the manager account a roster person with a couple of finished 1:1s
// that carry PROMISES (Promises loop) — so the phase-3 read-only surfacing is walkable
// without paying for a real run. Free: clones a finished run's state off disk, overrides
// the person + injects promises, writes to the local DB. Refuses to run in production.
//
// Attaches to manager@seroteams.com (override via SEED_EMAIL). Re-runnable — it inserts a
// fresh person each time, so run once. Remove seeded people from the Team page if you re-run.
//
//   node scripts/seed-promises.ts

import "../backend/api/env-boot.ts"; // load .env (DATABASE_URL) before the db client reads it
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, closeDb, hasDatabaseUrl } from "../backend/db/client.ts";
import { users } from "../backend/db/schema.ts";
import { createSession } from "../backend/engine/session.ts";
import { findRunDir } from "../backend/engine/run-history.ts";
import { upsertSession } from "../backend/db/sessions-store.ts";
import { pgPeopleRepo } from "../backend/api/services/team/people.repo.ts";
import { hydrateSession } from "../backend/api/session-persistence.ts";
import type { PersistedSession } from "../backend/api/session-persistence.ts";

const EMAIL = process.env.SEED_EMAIL || "manager@seroteams.com";
const STATE_FILE = "session-state.json";
const DAY = 24 * 60 * 60 * 1000;

// A finished run on disk to clone for a realistic briefing/artifacts base. First that
// exists wins — the exact source doesn't matter, we override the person + promises.
const SOURCE_CANDIDATES = [
  "2026_Jul01_09-39-bc25e16a",
  "2026_Jul01_10-44-e4c238dc",
  "2026_Jul01_12-00-seed1b2a3dc",
];

type Promise_ = { id: string; owner: "manager" | "report"; action: string; when: string; outcome: "yes" | "partly" | "no" | "changed" | null; at: number };

function readState(dir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, STATE_FILE), "utf8"));
  } catch {
    return null;
  }
}

function firstSourceState(): Record<string, unknown> | null {
  for (const id of SOURCE_CANDIDATES) {
    const dir = findRunDir(id);
    if (!dir) continue;
    const s = readState(dir);
    if (s && s.briefing) return s;
  }
  return null;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("seed-promises is a dev helper — refusing to run in production.");
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not set — start your local Postgres / .env first.");

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  const manager = rows[0];
  if (!manager) throw new Error(`No user ${EMAIL} in the local DB — register/log in once as that account first, then re-run.`);
  const { orgId, id: userId } = manager;

  const source = firstSourceState();
  if (!source) throw new Error("No finished source run found on disk to clone (looked in logs/). Seed a run first.");

  // The roster person these 1:1s are about.
  const person = await pgPeopleRepo.insert({ orgId, managerId: userId, name: "Priya Sharma", role: "Product Designer", seniority: "Senior" });
  console.log(`Seeding for ${EMAIL} (user ${userId}, org ${orgId}); person Priya Sharma = ${person.id}\n`);

  const now = Date.now();

  // Two 1:1s about Priya. The NEWEST carries the full outcome palette so the person page's
  // "Since last time" shows every chip; the older one shows a couple of resolved promises.
  const runs: Array<{ daysAgo: number; promises: Promise_[] }> = [
    {
      daysAgo: 2,
      promises: [
        { id: "sp-new-1", owner: "manager", action: "Revisit Priya's workload before the sprint", when: "this week", outcome: "no", at: now },
        { id: "sp-new-2", owner: "manager", action: "Share the design-system deck with her", when: "today", outcome: "yes", at: now },
        { id: "sp-new-3", owner: "report", action: "Draft the Q3 goals doc", when: "next week", outcome: "partly", at: now },
        { id: "sp-new-4", owner: "report", action: "Book time with the data team", when: "this week", outcome: "changed", at: now },
        { id: "sp-new-5", owner: "manager", action: "Agree the on-call rota", when: "today", outcome: null, at: now },
      ],
    },
    {
      daysAgo: 18,
      promises: [
        { id: "sp-old-1", owner: "manager", action: "Set up a regular 1:1 slot", when: "this week", outcome: "yes", at: now },
        { id: "sp-old-2", owner: "report", action: "Send over the portfolio links", when: "today", outcome: "yes", at: now },
      ],
    },
  ];

  for (const r of runs) {
    const { id, dir } = createSession();
    const when = now - r.daysAgo * DAY;
    const cloned: Record<string, unknown> = {
      ...source,
      id,
      dir,
      orgId,
      userId,
      personId: person.id,
      createdAt: when,
      lastSeenAt: when,
      completedAt: when,
      runLabel: "seed-promises",
      promises: r.promises,
      priorCheckin: null,
      ctx: { ...(source.ctx as Record<string, unknown>), name: "Priya Sharma", role: "Product Designer", seniority: "Senior", meetingType: "Bi-weekly check-in" },
    };
    await upsertSession(hydrateSession(cloned as unknown as PersistedSession, dir));
    console.log(`  + 1:1 (${r.daysAgo}d ago) with ${r.promises.length} promise(s)`);
  }

  console.log(`\nDone. Log in as ${EMAIL}, open Team → Priya Sharma to see the follow-through chips.`);
  await closeDb();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
