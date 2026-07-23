import { test } from "node:test";
import assert from "node:assert/strict";
import { INTAKE_SUBSTAGES, backTrail } from "./intake-wizard.ts";

// Phase 3 (design-consolidation): intake substages share the one wizard footer.
// Back walks real history; entering mid-flow (e.g. Back from Focus lands on
// NOTES) seeds the trail with the steps that logically came before, so Back
// still works from the entry step. A roster-picked person never saw ROLE or
// SENIORITY, so their trail skips them too.

test("substage order is the canonical five", () => {
  assert.deepEqual(
    [...INTAKE_SUBSTAGES],
    ["NAME", "ROLE", "SENIORITY", "MEETING_TYPE", "NOTES"],
  );
});

test("first substage has no trail: no Back on the entry step", () => {
  assert.deepEqual(backTrail("NAME", false), []);
  assert.deepEqual(backTrail("NAME", true), []);
});

test("free-text path entering at NOTES walks back through every earlier step", () => {
  assert.deepEqual(backTrail("NOTES", false), ["NAME", "ROLE", "SENIORITY", "MEETING_TYPE"]);
});

test("roster pick entering at NOTES skips ROLE and SENIORITY", () => {
  assert.deepEqual(backTrail("NOTES", true), ["NAME", "MEETING_TYPE"]);
});

test("roster pick entering at MEETING_TYPE can still step back to NAME", () => {
  assert.deepEqual(backTrail("MEETING_TYPE", true), ["NAME"]);
});

test("an unknown substage gets an empty trail, never a crash", () => {
  assert.deepEqual(backTrail("NOT_A_STEP", false), []);
});
