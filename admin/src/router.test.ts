// Tests for the router's audience walls — which stages are internal-toolset-only
// (hidden from managers, manager-ready Phase 1) vs admin-only vs member destinations.
import test from "node:test";
import assert from "node:assert/strict";
import { isInternalStage, isAdminStage, isMemberStage, isGuestStage, urlForState } from "./router.js";
import { STAGES } from "./state.js";

test("the guest front door (WELCOME) left the admin app (frontend-admin-split Phase 3)", () => {
  // The guest-first start screen lives in the CUSTOMER app now — the admin
  // router no longer routes it ("/" is the internal START; logged-out → login).
  // The customer router's own test asserts WELCOME at "/" over there.
  assert.ok(STAGES.WELCOME, "STAGES.WELCOME still exists (shared enum)");
  assert.equal(urlForState({ stage: STAGES.WELCOME }), null);
  assert.equal(isGuestStage(STAGES.WELCOME), false);
});

test("isInternalStage: the workshop is internal-only", () => {
  for (const s of [STAGES.LIBRARY, STAGES.COMPARE, STAGES.PERSONAS, STAGES.LEXICON_REVIEW,
    STAGES.ROLE_LEXICONS, STAGES.MEETING_ARCS, STAGES.TASKS, STAGES.GUIDE]) {
    assert.equal(isInternalStage(s), true, `${s} is internal-only`);
  }
});

test("isInternalStage: a manager's own destinations are NOT internal-only", () => {
  for (const s of [STAGES.START, STAGES.REVIEW_RUN, STAGES.INTAKE, STAGES.TEAM, STAGES.RUNS,
    STAGES.MEMBER_HOME, STAGES.ABOUT, STAGES.FEEDBACK]) {
    assert.equal(isInternalStage(s), false, `${s} stays manager-reachable`);
  }
});

test("isGuestStage: a guest may take a run — intake + the run flow, nothing else", () => {
  // The guest lane (guest-run Phase 2): intake and the run stages are reachable
  // with no account…
  for (const s of [STAGES.INTAKE, STAGES.FOCUS_POINTS, STAGES.PREPARATION, STAGES.BANK,
    STAGES.QUESTIONING, STAGES.EVAL, STAGES.BRIEFING]) {
    assert.equal(isGuestStage(s), true, `${s} is guest-reachable`);
  }
  // …but the internal QA debrief, dashboards, history and admin tooling are not.
  for (const s of [STAGES.RUN_DEBRIEF, STAGES.START, STAGES.RUNS, STAGES.RUN_DETAIL,
    STAGES.MEMBER_HOME, STAGES.TEAM, STAGES.TASKS, STAGES.LIBRARY,
    STAGES.ADMIN_REGISTERED, STAGES.ADMIN_ERROR_LOG, STAGES.LEXICON_REVIEW]) {
    assert.equal(isGuestStage(s), false, `${s} needs an account`);
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
