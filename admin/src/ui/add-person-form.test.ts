import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPersonForm, inviteEmailError, nameMatches } from "./add-person-form.ts";

// The "Add someone" modal collects name / job / seniority, plus an optional invite-by-email.
// This pure helper trims the raw fields into a draft the way the roster endpoint expects, and
// enforces the one client-side rule: a person needs a name. Role, seniority and email are optional.

test("trims a full form into a draft", () => {
  assert.deepEqual(
    cleanPersonForm({ name: "  Priya ", role: " Backend engineer ", seniority: " Senior " }),
    { name: "Priya", role: "Backend engineer", seniority: "Senior", email: "", invite: false },
  );
});

test("name is required. Blank or whitespace-only yields null", () => {
  assert.equal(cleanPersonForm({ name: "   ", role: "Engineer" }), null);
  assert.equal(cleanPersonForm({ name: "" }), null);
  assert.equal(cleanPersonForm({}), null);
});

test("role and seniority are optional. Absent becomes empty string", () => {
  assert.deepEqual(cleanPersonForm({ name: "Sam" }), {
    name: "Sam",
    role: "",
    seniority: "",
    email: "",
    invite: false,
  });
});

test("email is trimmed + lowercased; invite passes through", () => {
  assert.deepEqual(cleanPersonForm({ name: "Priya", email: "  Priya@Company.COM ", invite: true }), {
    name: "Priya",
    role: "",
    seniority: "",
    email: "priya@company.com",
    invite: true,
  });
});

test("handles junk input without throwing", () => {
  assert.equal(cleanPersonForm({ name: null, role: 7, seniority: {} }), null);
  assert.deepEqual(cleanPersonForm({ name: "Jo", role: null, seniority: undefined }), {
    name: "Jo",
    role: "",
    seniority: "",
    email: "",
    invite: false,
  });
});

test("inviteEmailError only complains when inviting with a bad email", () => {
  assert.equal(inviteEmailError({ invite: false, email: "" }), null); // not inviting → no email needed
  assert.equal(inviteEmailError({ invite: false, email: "junk" }), null); // ignored when not inviting
  assert.equal(inviteEmailError({ invite: true, email: "priya@company.com" }), null); // valid
  assert.equal(typeof inviteEmailError({ invite: true, email: "" }), "string"); // needs an address
  assert.equal(typeof inviteEmailError({ invite: true, email: "nope" }), "string"); // no @
});

test("nameMatches gates the delete confirm. Trimmed, case-insensitive, never on empty", () => {
  assert.equal(nameMatches("Brandy", "Brandy"), true);
  assert.equal(nameMatches("  brandy ", "Brandy"), true); // trim + case-insensitive
  assert.equal(nameMatches("Brand", "Brandy"), false); // partial doesn't count
  assert.equal(nameMatches("", "Brandy"), false); // empty never matches
  assert.equal(nameMatches("   ", "Brandy"), false);
  assert.equal(nameMatches("Brandy", ""), false); // no target, no match
  assert.equal(nameMatches(null, null), false);
});
