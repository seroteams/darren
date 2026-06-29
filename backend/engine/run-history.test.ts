import { test } from "node:test";
import assert from "node:assert/strict";
import { runOwnedByOrg } from "./run-history.ts";

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
