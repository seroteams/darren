import { test } from "node:test";
import assert from "node:assert/strict";
import { isInternalIdentity, requireInternalAdmin } from "../../middleware/require-auth.ts";
import type { RequestIdentity } from "../../middleware/request-context.ts";

// The role wall for guided sessions (Monthly Check-in): internal admins only. A plain
// `manager` (a corridor manager) must NOT pass — but a superadmin-by-email must, even when
// their stored role is `manager`, or we'd lock them out of their own tool (architecture §3.1).
const id = (over: Partial<RequestIdentity>): RequestIdentity => ({
  userId: "u",
  orgId: "o",
  roles: [],
  email: null,
  name: null,
  ...over,
});

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

test("requireInternalAdmin: 401 logged out, 403 plain manager, ok for admin", () => {
  assert.throws(() => requireInternalAdmin(id({ userId: null })), /sign/i); // "Not signed in"
  assert.throws(() => requireInternalAdmin(id({ roles: ["manager"] })), /internal only/i);
  assert.doesNotThrow(() => requireInternalAdmin(id({ roles: ["admin"] })));
});
