import { test } from "node:test";
import assert from "node:assert/strict";
import { pgAuthRepo } from "./auth.repo.ts";

// A synthetic dev identity (DEV_AUTOLOGIN) carries non-uuid ids like "dev-org". The
// organizations table keys id as uuid, so an unguarded lookup throws "invalid input
// syntax for type uuid" — a 500 that spammed the error log on GET /api/v1/auth/company.
// A non-uuid org provably matches no uuid-keyed row, so short-circuit BEFORE getDb() —
// these pass with no database, which is the proof the guard runs first.
test("pgAuthRepo.orgProfile: non-uuid org -> null (never hits the DB)", async () => {
  assert.equal(await pgAuthRepo.orgProfile("dev-org"), null);
});

test("pgAuthRepo.updateOrg: non-uuid org -> null (never hits the DB)", async () => {
  assert.equal(await pgAuthRepo.updateOrg("dev-org", { name: "Acme", sector: "Tech" }), null);
});
