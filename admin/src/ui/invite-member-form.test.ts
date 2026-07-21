import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanInvite } from "./invite-member-form.ts";

// The "Invite people" modal collects an email + a role. This pure helper trims/validates it: a
// real email is required, the role is manager|member (anything else falls back to member).

test("a valid email + role passes through, lowercased + trimmed", () => {
  assert.deepEqual(cleanInvite({ email: "  Ana@Company.COM ", role: "manager" }), {
    draft: { email: "ana@company.com", role: "manager" },
    error: null,
  });
});

test("email is required. Blank or no-@ yields an error, no draft", () => {
  assert.equal(cleanInvite({ email: "", role: "member" }).draft, null);
  assert.match(cleanInvite({ email: "nope", role: "member" }).error ?? "", /email/i);
});

test("role defaults to member when absent or unknown", () => {
  assert.equal(cleanInvite({ email: "a@b.co" }).draft?.role, "member");
  assert.equal(cleanInvite({ email: "a@b.co", role: "admin" }).draft?.role, "member"); // admin not offered → member
  assert.equal(cleanInvite({ email: "a@b.co", role: "MANAGER" }).draft?.role, "manager"); // case-insensitive
});
