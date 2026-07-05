// Tests for the router's audience walls — which stages are internal-toolset-only
// (hidden from managers, manager-ready Phase 1) vs admin-only vs member destinations.
import test from "node:test";
import assert from "node:assert/strict";
import { isInternalStage, isAdminStage, isMemberStage } from "./router.js";
import { STAGES } from "./state.js";

test("isInternalStage: the workshop is internal-only", () => {
  for (const s of [STAGES.LIBRARY, STAGES.COMPARE, STAGES.PERSONAS, STAGES.LEXICON_REVIEW,
    STAGES.ROLE_LEXICONS, STAGES.MEETING_ARCS, STAGES.TASKS, STAGES.UNIVERSE, STAGES.GUIDE]) {
    assert.equal(isInternalStage(s), true, `${s} is internal-only`);
  }
});

test("isInternalStage: a manager's own destinations are NOT internal-only", () => {
  for (const s of [STAGES.START, STAGES.REVIEW_RUN, STAGES.INTAKE, STAGES.TEAM, STAGES.RUNS,
    STAGES.MEMBER_HOME, STAGES.ABOUT, STAGES.FEEDBACK]) {
    assert.equal(isInternalStage(s), false, `${s} stays manager-reachable`);
  }
});

test("existing walls unchanged: admin stages + member stages still classify", () => {
  assert.equal(isAdminStage(STAGES.LIBRARY), true);
  assert.equal(isAdminStage(STAGES.TEAM), false);
  // member-view: only-runs — a member's only destinations are their past 1:1s + opening one.
  assert.equal(isMemberStage(STAGES.RUNS), true);
  assert.equal(isMemberStage(STAGES.RUN_DETAIL), true);
  assert.equal(isMemberStage(STAGES.TEAM), false);
});
