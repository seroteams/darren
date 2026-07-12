#!/usr/bin/env node
// people-roster hard delete — the cascade proof: deleting a person wipes their roster
// row, every 1:1 about them, those runs' artifacts, and any pending invite — all in one
// transaction — while a SECOND person in the same org is left untouched (the fence).
//
// FREE: touches Postgres, never the OpenAI API. SKIPS (passes) when DATABASE_URL is unset,
// so `npm test` stays green on a machine with no database configured.

const assert = require("node:assert");
const { loadEnv } = require("../../engine/env.ts");

loadEnv(); // pull DATABASE_URL from the gitignored .env (npm test doesn't load it)

if (!process.env.DATABASE_URL) {
  console.log("SKIP test-pg-person-delete (no DATABASE_URL — file storage in use)");
  process.exit(0);
}

const { eq } = require("drizzle-orm");
const { getDb, closeDb } = require("../../db/client.ts");
const { organizations, users, people, sessions, runArtifacts, invitations } = require("../../db/schema.ts");
const { pgPeopleRepo } = require("../../api/services/team/people.repo.ts");

let failed = 0;
function check(name, cond) {
  if (cond) console.log(`  ok  ${name}`);
  else { failed++; console.error(`  FAIL ${name}`); }
}

const countBy = async (db, table, col, val) =>
  (await db.select().from(table).where(eq(col, val))).length;

(async () => {
  const db = getDb();

  // seed: an org + a manager
  const [org] = await db.insert(organizations).values({ name: "Delete Test Org" }).returning({ id: organizations.id });
  const [mgr] = await db
    .insert(users)
    .values({ orgId: org.id, email: `del-test-${org.id}@example.com`, name: "Mgr", role: "manager" })
    .returning({ id: users.id });

  // two people: A (to delete) and B (the control that must survive)
  const a = await pgPeopleRepo.insert({ orgId: org.id, managerId: mgr.id, name: "Delete Me", role: "Web Designer", seniority: "Senior" });
  const b = await pgPeopleRepo.insert({ orgId: org.id, managerId: mgr.id, name: "Keep Me", role: "UX Lead" });

  // A: two 1:1 runs (each with an artifact) + a pending invite. B: one run + artifact.
  const aKeys = [`del_a_1_${org.id}`, `del_a_2_${org.id}`];
  const bKey = `del_b_1_${org.id}`;
  for (const k of aKeys) {
    await db.insert(sessions).values({ orgId: org.id, sessionKey: k, state: {}, personId: a.id });
    await db.insert(runArtifacts).values({ sessionKey: k, orgId: org.id, name: "response.json", kind: "json", content: {} });
  }
  await db.insert(sessions).values({ orgId: org.id, sessionKey: bKey, state: {}, personId: b.id });
  await db.insert(runArtifacts).values({ sessionKey: bKey, orgId: org.id, name: "response.json", kind: "json", content: {} });
  await db.insert(invitations).values({ orgId: org.id, email: "invitee@example.com", personId: a.id });

  // ── the hard delete ──
  await pgPeopleRepo.remove(a.id, org.id);

  // A: the row and everything about them is gone
  check("person A row deleted", (await pgPeopleRepo.findForManager(a.id, org.id, mgr.id)) === null);
  check("A's runs deleted", (await countBy(db, sessions, sessions.personId, a.id)) === 0);
  check("A's artifacts (run 1) deleted", (await countBy(db, runArtifacts, runArtifacts.sessionKey, aKeys[0])) === 0);
  check("A's artifacts (run 2) deleted", (await countBy(db, runArtifacts, runArtifacts.sessionKey, aKeys[1])) === 0);
  check("A's invite deleted", (await countBy(db, invitations, invitations.personId, a.id)) === 0);

  // B: completely untouched (the fence — a delete is one person, not the org)
  check("person B row survives", (await pgPeopleRepo.findForManager(b.id, org.id, mgr.id)) !== null);
  check("B's run survives", (await countBy(db, sessions, sessions.personId, b.id)) === 1);
  check("B's artifact survives", (await countBy(db, runArtifacts, runArtifacts.sessionKey, bKey)) === 1);

  // cleanup — remove B (cascades its run+artifact), then the manager + org
  await pgPeopleRepo.remove(b.id, org.id);
  await db.delete(users).where(eq(users.id, mgr.id));
  await db.delete(organizations).where(eq(organizations.id, org.id));
  await closeDb();

  assert.equal(failed, 0, `${failed} check(s) failed`);
  console.log("test-pg-person-delete: all checks passed");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
