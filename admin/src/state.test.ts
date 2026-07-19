// Tests for the role helpers in state.js — who counts as console-admitted (isAdmin)
// vs who sees the internal toolset rail (isInternalAdmin, manager-ready Phase 1) —
// plus the resetSession leak guard for the promises flags.
import test from "node:test";
import assert from "node:assert/strict";
import { isAdmin, isInternalAdmin, store, setState, resetSession } from "./state.js";

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

// Regression (promises-before-recap): these flags used to be set ad-hoc on the
// store without a home in `initial`, so resetSession() couldn't clear them and a
// locked run silenced the promises step for every later run in the same tab.
test("resetSession clears the promises flags for the next run", () => {
  setState({
    promises: [{ owner: "manager", action: "x", when: "" }],
    promisesConfirmed: true,
    promisesConfirmSkip: true,
    promisesSaveFailed: true,
  });
  resetSession();
  assert.equal(store.promises, null);
  assert.equal(store.promisesConfirmed, false);
  assert.equal(store.promisesConfirmSkip, false);
  assert.equal(store.promisesSaveFailed, false);
});
