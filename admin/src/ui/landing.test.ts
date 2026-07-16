import { test } from "node:test";
import assert from "node:assert/strict";
import { landingStage } from "./landing.ts";
import { STAGES } from "../state.js";

// One home resolver, so login and a reload never disagree (audit B1 split-brain).
// A manager/admin lands on START; a member lands on the per-app member home passed in.

test("a manager lands on START regardless of the member home", () => {
  assert.equal(landingStage({ roles: ["manager"] }, STAGES.RUNS), STAGES.START);
  assert.equal(landingStage({ roles: ["admin"] }, STAGES.MEMBER_HOME), STAGES.START);
});

test("a member lands on the injected per-app member home", () => {
  // Admin app injects RUNS (Past 1:1s); customer app injects MEMBER_HOME.
  assert.equal(landingStage({ roles: ["member"] }, STAGES.RUNS), STAGES.RUNS);
  assert.equal(landingStage({ roles: ["member"] }, STAGES.MEMBER_HOME), STAGES.MEMBER_HOME);
});

test("no user is treated as a member (never handed the manager dashboard)", () => {
  assert.equal(landingStage(null, STAGES.RUNS), STAGES.RUNS);
});
