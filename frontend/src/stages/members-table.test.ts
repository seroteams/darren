import { test } from "node:test";
import assert from "node:assert/strict";
import { membersTable, roleBadge, statusTag, type MemberRow } from "./members-table.ts";

// Pure render for the Members table — no DOM, no CSS, so it runs under node --test. Proves the
// row/badge/tag markup, HTML-escaping, and the pending-invite (no-name) case.

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
