import { test } from "node:test";
import assert from "node:assert/strict";
import { requireAdmin } from "./require-auth.ts";

// --- requireAdmin (the pure gate: managers + admins pass, members and anonymous don't) ---
// Moved from admin-guard.test.ts when requireAdminRoute was retired (refactor-2026-07 P1);
// the route-wrapper plumbing is covered by internal-tool-guard.test.ts.

test("requireAdmin: anonymous → 401", () => {
  assert.throws(() => requireAdmin({ userId: null, orgId: null, roles: [], email: null, name: null }), (err: unknown) => {
    assert.equal((err as { status?: number }).status, 401);
    return true;
  });
});

test("requireAdmin: logged-in member → 403", () => {
  assert.throws(() => requireAdmin({ userId: "u2", orgId: "o1", roles: ["member"], email: "u2@example.com", name: "Member Two" }), (err: unknown) => {
    assert.equal((err as { status?: number }).status, 403);
    return true;
  });
});

test("requireAdmin: manager and admin are allowed", () => {
  assert.doesNotThrow(() => requireAdmin({ userId: "u1", orgId: "o1", roles: ["manager"], email: "u1@example.com", name: "Manager One" }));
  assert.doesNotThrow(() => requireAdmin({ userId: "u3", orgId: "o1", roles: ["admin"], email: "u3@example.com", name: "Admin Three" }));
});
