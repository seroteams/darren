import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isInternalIdentity,
  requireAdmin,
} from "../../middleware/require-auth.ts";
import type { RequestIdentity } from "../../middleware/request-context.ts";

// The role wall for guided sessions (Monthly Check-in): requireAdmin — admins AND managers
// (the customer end user who runs 1:1s) pass; members are 403. Widened from
// requireInternalAdmin on 2026-07-19 when Monthly Check-in went to real managers.
// Ownership stays enforced in the service (org + manager fence, see guided-sessions.service.test.ts).
const id = (over: Partial<RequestIdentity>): RequestIdentity => ({
  userId: "u",
  orgId: "o",
  roles: [],
  email: null,
  name: null,
  ...over,
});

test("guided wall: 401 logged out, manager and admin pass, member is 403", () => {
  assert.throws(() => requireAdmin(id({ userId: null })), /sign/i); // "Not signed in"
  assert.doesNotThrow(() => requireAdmin(id({ roles: ["manager"] })));
  assert.doesNotThrow(() => requireAdmin(id({ roles: ["admin"] })));
  assert.throws(() => requireAdmin(id({ roles: ["member"] })), /admins only/i);
});

// isInternalIdentity no longer gates guided routes, but it still backs the admin-console
// internal rail (mirrored client-side in admin/src/state.js) — keep its behaviour pinned.
test("isInternalIdentity: admin passes, plain manager/member do not", () => {
  assert.equal(isInternalIdentity(id({ roles: ["admin"] })), true);
  assert.equal(isInternalIdentity(id({ roles: ["manager"] })), false);
  assert.equal(isInternalIdentity(id({ roles: ["member"] })), false);
});

test("isInternalIdentity: a superadmin-by-email passes even as a manager", () => {
  const prev = process.env.SUPERADMIN_EMAILS;
  process.env.SUPERADMIN_EMAILS = "boss@seroteams.com";
  try {
    assert.equal(isInternalIdentity(id({ roles: ["manager"], email: "boss@seroteams.com" })), true);
    assert.equal(isInternalIdentity(id({ roles: ["manager"], email: "someone@else.com" })), false);
  } finally {
    if (prev === undefined) delete process.env.SUPERADMIN_EMAILS;
    else process.env.SUPERADMIN_EMAILS = prev;
  }
});
