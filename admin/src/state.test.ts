// Tests for the role helpers in state.js — who counts as console-admitted (isAdmin)
// vs who sees the internal toolset rail (isInternalAdmin, manager-ready Phase 1).
import test from "node:test";
import assert from "node:assert/strict";
import { isAdmin, isInternalAdmin } from "./state.js";

test("isAdmin: manager and admin are console-admitted; member and logged-out are not", () => {
  assert.equal(isAdmin({ roles: ["admin"] }), true);
  assert.equal(isAdmin({ roles: ["manager"] }), true);
  assert.equal(isAdmin({ role: "manager" }), true); // single-role shape
  assert.equal(isAdmin({ roles: ["member"] }), false);
  assert.equal(isAdmin(null), false);
});

test("isInternalAdmin: only the admin role sees the internal toolset", () => {
  assert.equal(isInternalAdmin({ roles: ["admin"] }), true);
  assert.equal(isInternalAdmin({ role: "admin" }), true); // single-role shape
  assert.equal(isInternalAdmin({ roles: ["manager"] }), false);
  assert.equal(isInternalAdmin({ roles: ["member"] }), false);
  assert.equal(isInternalAdmin(null), false);
});
