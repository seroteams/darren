import { test } from "node:test";
import assert from "node:assert/strict";
import { runOwnedByOrg, runOwnedByUser } from "./run-history.ts";

// runOwnedByOrg is the data wall (Phase 007/2): the single rule the run-history
// reads use to decide whether a run is visible to the caller's company.

test("with no caller orgId, every run is visible (unfenced: CLI / gate / restore)", () => {
  assert.equal(runOwnedByOrg({ orgId: "org-A" }, undefined), true);
  assert.equal(runOwnedByOrg({ orgId: "org-A" }, null), true);
  assert.equal(runOwnedByOrg({ orgId: null }, undefined), true);
});

test("a company sees its own runs and only its own", () => {
  assert.equal(runOwnedByOrg({ orgId: "org-A" }, "org-A"), true);
  assert.equal(runOwnedByOrg({ orgId: "org-B" }, "org-A"), false);
});

test("a run with no company is invisible to any real company (pre-auth / anonymous)", () => {
  assert.equal(runOwnedByOrg({ orgId: null }, "org-A"), false);
  assert.equal(runOwnedByOrg({}, "org-A"), false);
});

test("a non-object state is never owned by a real company", () => {
  assert.equal(runOwnedByOrg(null, "org-A"), false);
  assert.equal(runOwnedByOrg("nope", "org-A"), false);
});

// runOwnedByUser is the member data wall (member-nav Phase 2): a member only ever sees
// runs they created — and unlike the org wall it is NEVER unfenced.
test("a member sees their own runs and only their own", () => {
  assert.equal(runOwnedByUser({ userId: "u1" }, "u1"), true);
  assert.equal(runOwnedByUser({ userId: "u2" }, "u1"), false);
});

test("no caller userId matches nothing (members are never unfenced, unlike orgs)", () => {
  assert.equal(runOwnedByUser({ userId: "u1" }, undefined), false);
  assert.equal(runOwnedByUser({ userId: "u1" }, null), false);
});

test("a run with no userId is invisible to any member", () => {
  assert.equal(runOwnedByUser({ userId: null }, "u1"), false);
  assert.equal(runOwnedByUser({}, "u1"), false);
});

test("a non-object state is never owned by a member", () => {
  assert.equal(runOwnedByUser(null, "u1"), false);
  assert.equal(runOwnedByUser("nope", "u1"), false);
});
