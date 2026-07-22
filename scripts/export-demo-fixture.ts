// Dev-only, one-off: export the signup demo fixture (demo-member phase 1).
// Reads ONE finished seeded run (Sofia · Bi-weekly check-in by default) from the
// local DB — its state jsonb plus its run_artifacts rows — strips the ownership
// ids, and writes the committed fixture the register-time seed clones for every
// new signup: content/demo/demo-run.json. ctx and briefing stay verbatim.
//
//   npx tsx scripts/export-demo-fixture.ts [session_key]
//
// FREE: local Postgres reads only, never the OpenAI API. Refuses to run in production.

import "../backend/api/env-boot.ts";
import fs from "node:fs";
import path from "node:path";
import { eq, and, like, desc } from "drizzle-orm";
import { getDb, closeDb, hasDatabaseUrl } from "../backend/db/client.ts";
import { sessions, runArtifacts } from "../backend/db/schema.ts";
import { CONTENT_DIR } from "../backend/engine/paths.mts";
import { isObjectRecord } from "../backend/shared/guards.ts";

const OUT_PATH = path.join(CONTENT_DIR, "demo", "demo-run.json");

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("export-demo-fixture is a dev helper — refusing to run in production.");
  }
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not set — start your local Postgres / .env first.");
  }
  const db = getDb();

  const wantedKey = process.argv[2];
  const rows = await db
    .select({ sessionKey: sessions.sessionKey, state: sessions.state })
    .from(sessions)
    .where(
      wantedKey
        ? eq(sessions.sessionKey, wantedKey)
        : and(eq(sessions.runLabel, "seed"), eq(sessions.finished, true), like(sessions.personName, "Sofia%")),
    )
    .orderBy(desc(sessions.lastSeenAt))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("No source run found — pass a session_key or seed the Sofia run first.");
  if (!isObjectRecord(row.state)) throw new Error(`Run ${row.sessionKey} has no readable state.`);
  if (!row.state.briefing) throw new Error(`Run ${row.sessionKey} has no briefing (not finished).`);

  // Strip everything that ties the run to its source owner/location — the seed
  // rewrites all of these per signup. Content fields stay untouched.
  const state: Record<string, unknown> = { ...row.state };
  delete state.orgId;
  delete state.userId;
  delete state.personId;
  delete state.dir;
  delete state.runLabel;
  delete state.isDemo;

  const artifacts = (
    await db.select().from(runArtifacts).where(eq(runArtifacts.sessionKey, row.sessionKey))
  ).map((a) => ({ stage: a.stage, name: a.name, kind: a.kind, content: a.content, contentText: a.contentText }));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify({ state, artifacts }, null, 1));

  const ctx = isObjectRecord(state.ctx) ? (state.ctx as Record<string, string>) : {};
  const kb = Math.round(fs.statSync(OUT_PATH).size / 1024);
  console.log(`Exported ${row.sessionKey}`);
  console.log(`  who: ${[ctx.name, ctx.role, ctx.seniority, ctx.meetingType].filter(Boolean).join(" · ")}`);
  console.log(`  artifacts: ${artifacts.length} · file: ${OUT_PATH} (${kb} KB)`);
  await closeDb();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
