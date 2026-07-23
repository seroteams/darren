import { test } from "node:test";
import assert from "node:assert/strict";
import { membersTable, roleBadge, statusTag, filterMembers, type MemberRow } from "./members-table.ts";

// Pure render for the Members table — no DOM, no CSS, so it runs under node --test. Proves the
// row/badge/tag markup, HTML-escaping, the pending-invite (no-name) case, the shared initials
// avatar in the Member cell, and the client-side search filter (design-consolidation Phase 1).

const row = (over: Partial<MemberRow>): MemberRow => ({
  kind: "account",
  id: "u1",
  name: "Ana",
  email: "ana@qa.test",
  role: "manager",
  status: "active",
  ...over,
});

test("renders one row per member with role + status", () => {
  const html = membersTable([row({}), row({ id: "u2", name: "Bo", email: "bo@qa.test", role: "member" })]);
  assert.equal((html.match(/um-row/g) ?? []).length, 2); // body rows only (the <thead> tr has no um-row)
  assert.match(html, /Ana/);
  assert.match(html, /ana@qa\.test/);
});

test("status tags map correctly", () => {
  assert.match(statusTag("active"), /Active/);
  assert.match(statusTag("invited"), /Invited/);
  assert.match(statusTag("deactivated"), /Deactivated/);
});

test("role badge falls back to member for unknown roles", () => {
  assert.match(roleBadge("manager"), /um-badge--manager/);
  assert.match(roleBadge("wizard"), /um-badge--member/); // unknown → neutral member style
});

test("a pending invite (no name) shows its email as the primary line", () => {
  const html = membersTable([row({ kind: "invite", name: "", email: "new@qa.test", status: "invited" })]);
  assert.match(html, /new@qa\.test/);
  assert.match(html, /Invited/);
});

test("escapes HTML in names and emails", () => {
  const html = membersTable([row({ name: "<script>x</script>", email: "a&b@qa.test" })]);
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&amp;/);
});

test("the Member cell carries the shared initials avatar, tinted by status", () => {
  const active = membersTable([row({ name: "Ana Torres" })]);
  assert.match(active, /team-card__avatar/, "same avatar recipe as the Team list");
  assert.ok(active.includes(">AT<"), "initials from first + last name");
  assert.match(active, /team-card__avatar--joined/, "active member wears the on-Sero tint");
  const invited = membersTable([row({ kind: "invite", name: "", email: "new@qa.test", status: "invited" })]);
  assert.match(invited, /team-card__avatar--invited/, "pending invite wears the invited tint");
  const off = membersTable([row({ status: "deactivated" })]);
  assert.match(off, /team-card__avatar--none/, "deactivated wears the neutral tint");
});

test("the row menu uses the shared Lucide glyph, not a text ⋯", () => {
  const html = membersTable([row({})]);
  assert.match(html, /js-member-menu/);
  assert.match(html, /sero-icon/, "Lucide MoreHorizontal via ui/icon.js");
  assert.ok(!html.includes("⋯"), "no raw glyph left in the markup");
});

test("filterMembers matches name or email as you type, case-insensitively", () => {
  const rows = [row({}), row({ id: "u2", name: "Bo", email: "bo@qa.test" }), row({ id: "i1", kind: "invite", name: "", email: "new@qa.test", status: "invited" })];
  assert.deepEqual(filterMembers(rows, ""), rows, "empty query keeps everyone");
  assert.deepEqual(filterMembers(rows, "ANA").map((m) => m.id), ["u1"], "matches by name");
  assert.deepEqual(filterMembers(rows, "new@").map((m) => m.id), ["i1"], "matches by email");
  assert.deepEqual(filterMembers(rows, "nobody"), [], "no match filters everyone out");
});
