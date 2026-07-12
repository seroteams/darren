import { test } from "node:test";
import assert from "node:assert/strict";
import { pgPeopleRepo } from "./people.repo.ts";

// A synthetic dev identity (DEV_AUTOLOGIN) carries non-uuid ids like "dev-org" / "dev-user".
// The people table keys org_id / manager_id as uuid, so an unguarded query throws
// "invalid input syntax for type uuid" — a 500 that spammed the error log on every
// GET /api/v1/team/people. These prove the repo short-circuits to an empty result for a
// non-uuid caller (which provably owns no uuid-keyed rows) WITHOUT touching the database,
// so getDb() is never reached. Same guard the people-aliases repo already uses.
test("pgPeopleRepo.listForManager: non-uuid ids -> [] (never hits the DB)", async () => {
  assert.deepEqual(await pgPeopleRepo.listForManager("dev-org", "dev-user"), []);
});

test("pgPeopleRepo.findForManager: non-uuid ids -> null", async () => {
  assert.equal(await pgPeopleRepo.findForManager("dev-user", "dev-org", "dev-user"), null);
});

test("pgPeopleRepo.findByLinkedUser: non-uuid ids -> []", async () => {
  assert.deepEqual(await pgPeopleRepo.findByLinkedUser("dev-user", "dev-org"), []);
});

test("pgPeopleRepo.listOrgUsers: non-uuid org -> []", async () => {
  assert.deepEqual(await pgPeopleRepo.listOrgUsers("dev-org"), []);
});
