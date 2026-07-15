#!/usr/bin/env node
// H-1 regression (personal-data-security Phase 1): the "prefill a run" tool
// (/runs/clonable + /runs/clone) reads runs UNFENCED across every company, so it
// must never be reachable by a customer. Every signup is a `manager`, and the old
// guard `requireAdmin` lets managers through — so any customer could clone another
// company's run and read its notes/briefing. The fix routes production access
// through `requirePrefillAccess`, which requires SUPERADMIN (the same email
// allowlist that guards every other cross-company internal endpoint). This test
// pins that policy so the hole can't silently reopen.
//
// FREE: pure gate logic, no DB, no OpenAI. Always runs.

const assert = require("node:assert");
const { requirePrefillAccess } = require("../../api/middleware/require-auth.ts");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}: ${e.message}`); }
}

function identity(overrides) {
  return { userId: null, orgId: null, roles: [], email: null, name: null, ...overrides };
}
function throwsWithStatus(fn, status) {
  try { fn(); } catch (e) { return e && e.status === status; }
  return false;
}

// The superadmin allowlist is an email set; set one internal email for the pass case.
process.env.SUPERADMIN_EMAILS = "internal@seroteams.com";

const manager = identity({ userId: "u-mgr", orgId: "org-a", roles: ["manager"], email: "boss@customer.com" });
const admin = identity({ userId: "u-adm", orgId: "org-a", roles: ["admin"], email: "someone@customer.com" });
const superadmin = identity({ userId: "u-sa", orgId: "org-sero", roles: ["manager"], email: "internal@seroteams.com" });
const anon = identity({});

// --- Production: only a superadmin (by allowlisted email) may reach the tool ---
check("prod: a customer manager is FORBIDDEN (the H-1 fix)", () => {
  assert.ok(throwsWithStatus(() => requirePrefillAccess(manager, true), 403));
});
check("prod: a plain 'admin' role NOT on the allowlist is FORBIDDEN", () => {
  assert.ok(throwsWithStatus(() => requirePrefillAccess(admin, true), 403));
});
check("prod: a superadmin (allowlisted email) is ALLOWED", () => {
  assert.doesNotThrow(() => requirePrefillAccess(superadmin, true));
});
check("prod: anonymous is refused", () => {
  assert.ok(throwsWithStatus(() => requirePrefillAccess(anon, true), 401));
});

// --- Non-production: the local QA one-click keeps working for any logged-in user ---
check("dev: any logged-in user is ALLOWED (dev prefill unaffected)", () => {
  assert.doesNotThrow(() => requirePrefillAccess(manager, false));
});
check("dev: anonymous is still refused", () => {
  assert.ok(throwsWithStatus(() => requirePrefillAccess(anon, false), 401));
});

// --- Fail-safe: an empty allowlist denies everyone in production (deny by default) ---
check("prod: empty SUPERADMIN_EMAILS denies even a would-be superadmin", () => {
  process.env.SUPERADMIN_EMAILS = "";
  assert.ok(throwsWithStatus(() => requirePrefillAccess(superadmin, true), 403));
});

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nprefill-access-gate: all checks passed");
