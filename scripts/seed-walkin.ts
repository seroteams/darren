// Dev-only seed: put ONE 1:1 in the local DB that is ready to start but not yet
// begun (turn 0, bank already built), attached to a chosen roster person. That is
// the exact state the runner's first screen needs, so the walk-in card and last
// time's actions can be walked on the REAL app for free.
//
// Free: clones a finished run off disk for its question bank and prep brief, then
// rewinds it — no transcript, no briefing, no promises of its own, turn 0. Nothing
// here calls OpenAI. Same trick, same rules as scripts/seed-promises.ts, which it
// pairs with: seed-promises gives the person a PAST 1:1 carrying open actions, this
// gives them the NEXT one to walk into. Refuses to run in production.
//
//   node scripts/seed-promises.ts        # the past 1:1 (creates Priya Sharma)
//   node scripts/seed-walkin.ts          # the one to walk into
//
// Env: SEED_EMAIL (default manager@seroteams.com), SEED_PERSON (default the newest
// roster person for that manager).

import "../backend/api/env-boot.ts";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, closeDb, hasDatabaseUrl } from "../backend/db/client.ts";
import { users, people } from "../backend/db/schema.ts";
import { createSession } from "../backend/engine/session.ts";
import { findRunDir } from "../backend/engine/run-history.ts";
import { upsertSession } from "../backend/db/sessions-store.ts";
import { hydrateSession } from "../backend/api/session-persistence.ts";
import type { PersistedSession } from "../backend/api/session-persistence.ts";

const EMAIL = process.env.SEED_EMAIL || "manager@seroteams.com";
const STATE_FILE = "session-state.json";

// A finished run to borrow a real bank + prep brief from. First that exists wins:
// the content is never the thing under test here, only the state shape is.
const SOURCE_CANDIDATES = [
  "2026_Jul29_23-46-0bf85fec2a5b4661a857b291cdc931ca",
  "2026_Jul01_09-39-bc25e16a",
  "2026_Jul01_10-44-e4c238dc",
];

function readState(dir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, STATE_FILE), "utf8"));
  } catch {
    return null;
  }
}

function firstSource(): Record<string, unknown> | null {
  for (const id of SOURCE_CANDIDATES) {
    const dir = findRunDir(id);
    if (!dir) continue;
    const s = readState(dir);
    if (s && s.bankReady && s.preparationResult) return s;
  }
  return null;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("seed-walkin is a dev helper. Refusing to run in production.");
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not set. Start your local Postgres / .env first.");

  const db = getDb();
  const [manager] = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  if (!manager) throw new Error(`No user ${EMAIL} in the local DB. Register/log in once as that account, then re-run.`);
  const { orgId, id: userId } = manager;

  const roster = await db.select().from(people).where(eq(people.managerId, userId));
  const wanted = process.env.SEED_PERSON;
  const person = wanted ? roster.find((p) => p.name === wanted) : roster[roster.length - 1];
  if (!person) throw new Error(`No roster person${wanted ? ` called "${wanted}"` : ""} for ${EMAIL}. Run scripts/seed-promises.ts first.`);

  const source = firstSource();
  if (!source) throw new Error("No finished source run with a bank found on disk to clone (looked in logs/).");

  const { id, dir } = createSession();
  const now = Date.now();
  const rewound: Record<string, unknown> = {
    ...source,
    id,
    dir,
    orgId,
    userId,
    personId: person.id,
    createdAt: now,
    lastSeenAt: now,
    completedAt: null,
    runLabel: "seed-walkin",
    // The rewind. bankReady stays, so inferStage lands on QUESTIONING; everything
    // that only exists AFTER the meeting starts is cleared, so the check-in is
    // eligible (it requires an empty transcript and no prior check-in).
    turn: 0,
    transcript: [],
    briefing: null,
    verdict: null,
    promises: null,
    priorCheckin: null,
    outcomeCheck: null,
    pendingAnswer: null,
    turnSnapshots: [],
    agendaCovered: null,
    mode: "manual",
    ctx: {
      ...(source.ctx as Record<string, unknown>),
      name: person.name,
      role: person.role || "Product Designer",
      seniority: person.seniority || "Senior",
      meetingType: process.env.SEED_MEETING_TYPE || "Bi-weekly check-in",
    },
  };

  await upsertSession(hydrateSession(rewound as unknown as PersistedSession, dir));
  console.log(`Seeded a ready-to-start 1:1 with ${person.name} for ${EMAIL}.`);
  console.log(`  session ${id}`);
  console.log(`  open it at /interview?session=${id} (or Home, where it shows as in progress)`);
  await closeDb();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
