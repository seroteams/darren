// Tests for the CUSTOMER router's audience walls (frontend-admin-split Phase 3) —
// the guest front door, the guest run lane, and the member-view: about-me only set.
// Mirrors admin/src/router.test.ts, which asserts the admin side of the split.
import test from "node:test";
import assert from "node:assert/strict";
import { isMemberStage, isGuestStage, isSharedStage, urlForState } from "./router.js";
import { STAGES } from "../../admin/src/state.js";

test("the guest-first start screen (WELCOME) lives at the customer root path", () => {
  // start-screen: the logged-out front door renders at "/" — boot decides whether
  // "/" shows WELCOME (logged out) or START (logged-in manager home).
  assert.equal(urlForState({ stage: STAGES.WELCOME }), "/");
  // The front door is not part of the guest RUN lane — that set gates mid-run
  // reload/rehydrate, which the start screen never needs.
  assert.equal(isGuestStage(STAGES.WELCOME), false);
});

test("join links route in the customer app", () => {
  // member-onboarding-invites: /join/:token is a customer URL; the token rides in state.
  assert.equal(urlForState({ stage: STAGES.JOIN, joinToken: "abc" }), "/join/abc");
  assert.equal(urlForState({ stage: STAGES.JOIN }), "/login");
});

test("isGuestStage: a guest may take a run — intake + the run flow, nothing else", () => {
  for (const s of [STAGES.INTAKE, STAGES.FOCUS_POINTS, STAGES.PREPARATION, STAGES.BANK,
    STAGES.QUESTIONING, STAGES.EVAL, STAGES.BRIEFING]) {
    assert.equal(isGuestStage(s), true, `${s} is guest-reachable`);
  }
  for (const s of [STAGES.RUN_DEBRIEF, STAGES.START, STAGES.RUNS, STAGES.RUN_DETAIL,
    STAGES.MEMBER_HOME, STAGES.TEAM, STAGES.JOIN]) {
    assert.equal(isGuestStage(s), false, `${s} needs an account`);
  }
});

test("member-view: about-me only — a member's destinations are the 1:1s about them + shared pages", () => {
  assert.equal(isMemberStage(STAGES.MEMBER_HOME), true);
  assert.equal(isMemberStage(STAGES.RUN_DETAIL), true);
  // The manager RUNS stage (authored runs + private ratings) is NOT a member destination.
  for (const s of [STAGES.RUNS, STAGES.TEAM, STAGES.PERSON_DETAIL, STAGES.START, STAGES.INTAKE]) {
    assert.equal(isMemberStage(s), false, `${s} is not a member destination`);
  }
  for (const s of [STAGES.PRIVACY, STAGES.ABOUT, STAGES.FEEDBACK]) {
    assert.equal(isSharedStage(s), true, `${s} is any-audience`);
  }
});
