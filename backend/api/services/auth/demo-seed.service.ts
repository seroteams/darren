// The signup demo seed (demo-member phase 1): give a brand-new manager one example
// person and one finished example 1:1, cloned from the committed fixture at
// content/demo/demo-run.json — so the first login already shows what a finished
// briefing looks like. Pure DB inserts, no OpenAI. Fired-and-forgotten from the
// register controller, so EVERYTHING here is best-effort: this function must never
// throw or reject — a broken seed must never break a signup.

import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "../../../engine/paths.mts";
import { createSession } from "../../../engine/session.ts";
import { getDb, hasDatabaseUrl } from "../../../db/client.ts";
import { runArtifacts } from "../../../db/schema.ts";
import { upsertSession } from "../../../db/sessions-store.ts";
import { hydrateSession } from "../../session-persistence.ts";
import type { PersistedSession } from "../../session-persistence.ts";
import type { Session } from "../../../shared/session.types.ts";
import { isObjectRecord } from "../../../shared/guards.ts";
import { pgPeopleRepo } from "../team/people.repo.ts";
import type { PeopleRepo } from "../team/people.repo.ts";

const FIXTURE_PATH = path.join(CONTENT_DIR, "demo", "demo-run.json");
const DAY = 24 * 60 * 60 * 1000;
const BACKDATE_DAYS = 3; // the example 1:1 reads as "a few days ago", newest-first lists stay honest

// Same guard as people.repo.ts: a synthetic dev identity (DEV_AUTOLOGIN) carries
// non-uuid ids that uuid columns reject — and provably owns no rows anyway.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

/** One stage artifact as shipped in the fixture (a run_artifacts row minus its keys). */
export interface DemoArtifact {
  stage: string;
  name: string;
  kind: string;
  content: unknown;
  contentText: string | null;
}

/** The committed fixture: a finished run's serialized state (ownership stripped at
 *  export time) plus its stage artifacts. */
export interface DemoFixture {
  state: Record<string, unknown>;
  artifacts: DemoArtifact[];
}

/** The storage seam — real DB/filesystem in production, fakes in tests. */
export interface DemoSeedDeps {
  hasDb: () => boolean;
  loadFixture: () => DemoFixture | null;
  createSession: () => { id: string; dir: string };
  insertPerson: PeopleRepo["insert"];
  upsertSession: (s: Session) => Promise<void>;
  insertArtifacts: (rows: DemoArtifact[], toKey: string, orgId: string) => Promise<void>;
  now: () => number;
}

function loadDemoFixture(): DemoFixture | null {
  const parsed: unknown = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  if (!isObjectRecord(parsed) || !isObjectRecord(parsed.state) || !Array.isArray(parsed.artifacts)) return null;
  return parsed as unknown as DemoFixture;
}

async function insertDemoArtifacts(rows: DemoArtifact[], toKey: string, orgId: string): Promise<void> {
  if (!rows.length) return;
  await getDb()
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

const realDeps: DemoSeedDeps = {
  hasDb: hasDatabaseUrl,
  loadFixture: loadDemoFixture,
  createSession,
  insertPerson: (fields) => pgPeopleRepo.insert(fields),
  upsertSession,
  insertArtifacts: insertDemoArtifacts,
  now: Date.now,
};

/** Seed the example workspace for a freshly registered manager: one demo person
 *  (built FROM the fixture's ctx, so roster and briefing can never disagree) and
 *  one finished, back-dated demo run with its artifacts. All rows carry is_demo,
 *  which keeps them out of admin metrics and counts. Never throws. */
export async function seedDemoWorkspace(
  user: { id: string; orgId: string },
  deps: DemoSeedDeps = realDeps,
): Promise<void> {
  try {
    if (!deps.hasDb()) return;
    if (!isUuid(user.id) || !isUuid(user.orgId)) return;

    const fixture = deps.loadFixture();
    if (!fixture || !isObjectRecord(fixture.state) || !fixture.state.briefing) {
      console.error("[demo-seed] fixture missing or unfinished — seeding skipped");
      return;
    }

    const ctx = isObjectRecord(fixture.state.ctx) ? fixture.state.ctx : {};
    const person = await deps.insertPerson({
      orgId: user.orgId,
      managerId: user.id,
      name: typeof ctx.name === "string" && ctx.name.trim() ? ctx.name : "Example person",
      role: typeof ctx.role === "string" ? ctx.role : null,
      seniority: typeof ctx.seniority === "string" ? ctx.seniority : null,
      isDemo: true,
    });

    const { id, dir } = deps.createSession();
    const when = deps.now() - BACKDATE_DAYS * DAY;
    // Re-own, re-date, flag — ctx and briefing stay verbatim (engine honesty).
    const cloned = {
      ...fixture.state,
      id,
      dir,
      orgId: user.orgId,
      userId: user.id,
      personId: person.id,
      createdAt: when,
      lastSeenAt: when,
      completedAt: when,
      runLabel: "demo",
      isDemo: true,
    };
    await deps.upsertSession(hydrateSession(cloned as unknown as PersistedSession, dir));
    await deps.insertArtifacts(fixture.artifacts, id, user.orgId);
  } catch (e) {
    console.error("[demo-seed] signup demo seed failed:", e instanceof Error ? e.message : e);
  }
}
