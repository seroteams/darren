#!/usr/bin/env node
// Company sector (capture only, 2026-07-26) — the Postgres destination proof. The unit
// tests beside the service run against an in-memory fake; this one proves the column,
// the migration and the real repo agree with it: a sector written through pgAuthRepo
// comes back from the DATABASE, and the HTTP layer hands the browser { company, sector }.
//
// FREE: this touches Postgres, NOT the OpenAI API — no model calls, no cost.
// It SKIPS (passes) when DATABASE_URL is unset, like the other pg round-trip tests.

const assert = require("node:assert");
const { loadEnv } = require("../../engine/env.ts");

loadEnv(); // pull DATABASE_URL from the gitignored .env (npm test doesn't load it)

if (!process.env.DATABASE_URL) {
  console.log("SKIP test-org-sector (no DATABASE_URL — file storage in use)");
  process.exit(0);
}

const { eq } = require("drizzle-orm");
const { getDb, closeDb } = require("../../db/client.ts");
const { organizations, users } = require("../../db/schema.ts");
const { pgAuthRepo } = require("../../api/services/auth/auth.repo.ts");
const { createAuthService } = require("../../api/services/auth/auth.service.ts");
const { getCompany, updateCompany } = require("../../api/services/auth/auth.controller.ts");
const { SESSION_COOKIE } = require("../../api/middleware/cookies.ts");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}: ${e.message}`); }
}

// A throwaway org for this run only, removed in the finally block below.
const ORG_NAME = `sector-test-${Date.now()}`;

// Minimal RequestContext + identity stand-ins: the controller reads the org id from the
// SESSION (never the body), so the cookie + lookup are what decide whose company is
// touched. The cookie has to be present or buildIdentity short-circuits to anonymous.
function fakeCtx(body) {
  const sent = {};
  return {
    sent,
    req: { headers: { cookie: `${SESSION_COOKIE}=test-token` } },
    res: { setHeader() {} },
    async readBody() { return body; },
    json(status, payload) { sent.status = status; sent.payload = payload; },
  };
}

(async () => {
  const db = getDb();
  const service = createAuthService(pgAuthRepo, { async hash(p) { return p; }, async verify() { return true; } });
  let orgId = "";
  let signupOrgId = "";
  let signupUserId = "";

  try {
    const inserted = await db.insert(organizations).values({ name: ORG_NAME }).returning();
    orgId = inserted[0].id;

    // 1. The column exists and a fresh org starts unset (the migration ran, nullable).
    const fresh = await service.getCompany(orgId);
    check("a brand-new org row has no sector", () => {
      assert.equal(fresh.name, ORG_NAME);
      assert.equal(fresh.sector, null);
    });

    // 2. A sector written through the service lands in the actual DATABASE row.
    await service.updateCompany({ orgId, name: ORG_NAME, sector: "healthcare" });
    const rows = await db.select().from(organizations).where(eq(organizations.id, orgId));
    const readBack = await service.getCompany(orgId);
    check("the sector is stored on the organizations row itself", () => {
      assert.equal(rows[0].sector, "healthcare");
    });
    check("it reads back through the repo", () => {
      assert.equal(readBack.sector, "healthcare");
    });

    // 3. A value outside the catalogue never reaches the database.
    let refused = false;
    try {
      await service.updateCompany({ orgId, name: ORG_NAME, sector: "not-a-sector" });
    } catch { refused = true; }
    const afterBad = await db.select().from(organizations).where(eq(organizations.id, orgId));
    check("an unknown sector is refused and the stored value is untouched", () => {
      assert.ok(refused, "the save threw");
      assert.equal(afterBad[0].sector, "healthcare");
    });

    // 4. Clearing it puts the row back to NULL (the field is optional and reversible).
    await service.updateCompany({ orgId, name: ORG_NAME, sector: "" });
    const afterClear = await db.select().from(organizations).where(eq(organizations.id, orgId));
    check("clearing the sector writes NULL back to the row", () => {
      assert.equal(afterClear[0].sector, null);
    });

    // 5. The HTTP shape the account page actually consumes: { company, sector } on both
    //    the read and the write, through the real controller and a manager identity.
    const identity = { userId: "u-test", orgId, roles: ["manager"], email: "t@t.test", name: "T" };
    const lookup = async () => identity;

    const writeCtx = fakeCtx({ company: ORG_NAME, sector: "education" });
    await updateCompany(writeCtx, lookup);
    check("POST update-company answers { company, sector }", () => {
      assert.equal(writeCtx.sent.status, 200);
      assert.deepEqual(writeCtx.sent.payload, { company: ORG_NAME, sector: "education" });
    });

    const readCtx = fakeCtx({});
    await getCompany(readCtx, lookup);
    check("GET company answers { company, sector } from the database", () => {
      assert.equal(readCtx.sent.status, 200);
      assert.deepEqual(readCtx.sent.payload, { company: ORG_NAME, sector: "education" });
    });

    // 6. Signup: a sector picked on the register form lands on the company row the
    //    transaction creates, in the same write as the org and its owner.
    const signup = await service.register({
      email: `${ORG_NAME}@sector.test`,
      name: "Sector Signup",
      password: "longenough1",
      company: `${ORG_NAME}-signup`,
      sector: "transport",
    });
    signupOrgId = signup.orgId;
    signupUserId = signup.id;
    const signupRow = await db.select().from(organizations).where(eq(organizations.id, signupOrgId));
    check("a sector chosen at signup is stored on the new company row", () => {
      assert.equal(signupRow[0].sector, "transport");
    });
  } finally {
    // Order matters: the owner references the org, so the user goes first.
    if (signupUserId) await getDb().delete(users).where(eq(users.id, signupUserId));
    if (signupOrgId) await getDb().delete(organizations).where(eq(organizations.id, signupOrgId));
    if (orgId) await getDb().delete(organizations).where(eq(organizations.id, orgId));
    await closeDb();
  }

  if (failed) { console.error(`\ntest-org-sector: ${failed} check(s) failed`); process.exit(1); }
  console.log("\ntest-org-sector: all checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
