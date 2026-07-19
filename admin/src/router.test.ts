// Tests for the router's audience walls — which stages are internal-toolset-only
// (hidden from managers, manager-ready Phase 1) vs admin-only vs member destinations.
import test from "node:test";
import assert from "node:assert/strict";
import { isInternalStage, isAdminStage, isMemberStage, isGuestStage, isSuperadminStage, urlForState } from "./router.js";
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
  // REVIEW_RUN (the raw QA verdict tool) joined the internal set — a manager never sees engine
  // hashes / Pass-Fail; their "Review" opens the clean run detail instead (audit M4).
  for (const s of [STAGES.LIBRARY, STAGES.COMPARE, STAGES.PERSONAS, STAGES.LEXICON_REVIEW,
    STAGES.ROLE_LEXICONS, STAGES.MEETING_ARCS, STAGES.GUIDE, STAGES.REVIEW_RUN]) {
    assert.equal(isInternalStage(s), true, `${s} is internal-only`);
  }
});

test("isInternalStage: a manager's own destinations are NOT internal-only", () => {
  // GUIDED joined the manager set 2026-07-19 — Monthly Check-in went to real managers.
  for (const s of [STAGES.START, STAGES.INTAKE, STAGES.TEAM, STAGES.RUNS,
    STAGES.MEMBER_HOME, STAGES.GUIDED, STAGES.ABOUT, STAGES.FEEDBACK]) {
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
    STAGES.MEMBER_HOME, STAGES.TEAM, STAGES.LIBRARY,
    STAGES.ADMIN_REGISTERED, STAGES.ADMIN_ERROR_LOG, STAGES.LEXICON_REVIEW]) {
    assert.equal(isGuestStage(s), false, `${s} needs an account`);
  }
});

test("pulse drill-downs: the three list pages are superadmin-only with their own URLs", () => {
  // Clicking a Pulse tile opens a list page (pulse-drilldowns) — same walls as Pulse itself.
  for (const s of [STAGES.ADMIN_GATE1, STAGES.ADMIN_RUNS, STAGES.ADMIN_RATINGS]) {
    assert.equal(isAdminStage(s), true, `${s} is behind the admin wall`);
    assert.equal(isSuperadminStage(s), true, `${s} is superadmin-only`);
  }
  assert.equal(urlForState({ stage: STAGES.ADMIN_GATE1 }), "/admin/gate1");
  assert.equal(urlForState({ stage: STAGES.ADMIN_RUNS }), "/admin/runs");
  assert.equal(urlForState({ stage: STAGES.ADMIN_RATINGS }), "/admin/ratings");
});

test("existing walls unchanged: admin stages + member stages still classify", () => {
  assert.equal(isAdminStage(STAGES.LIBRARY), true);
  assert.equal(isAdminStage(STAGES.TEAM), false);
  // member-view: only-runs — a member's only destinations are their past 1:1s + opening one.
  assert.equal(isMemberStage(STAGES.RUNS), true);
  assert.equal(isMemberStage(STAGES.RUN_DETAIL), true);
  assert.equal(isMemberStage(STAGES.TEAM), false);
});
