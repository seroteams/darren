import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPersonForm, nameMatches } from "./add-person-form.ts";

// The "Add someone" modal collects name / job / seniority. This pure helper trims the
// raw fields into a draft the way the roster endpoint expects, and enforces the one
// client-side rule: a person needs a name. Role and seniority are optional.

test("trims a full form into a draft", () => {
  assert.deepEqual(
    cleanPersonForm({ name: "  Priya ", role: " Backend engineer ", seniority: " Senior " }),
    { name: "Priya", role: "Backend engineer", seniority: "Senior" },
  );
});

test("name is required — blank or whitespace-only yields null", () => {
  assert.equal(cleanPersonForm({ name: "   ", role: "Engineer" }), null);
  assert.equal(cleanPersonForm({ name: "" }), null);
  assert.equal(cleanPersonForm({}), null);
});

test("role and seniority are optional — absent becomes empty string", () => {
  assert.deepEqual(cleanPersonForm({ name: "Sam" }), { name: "Sam", role: "", seniority: "" });
});

test("handles junk input without throwing", () => {
  assert.equal(cleanPersonForm({ name: null, role: 7, seniority: {} }), null);
  assert.deepEqual(cleanPersonForm({ name: "Jo", role: null, seniority: undefined }), {
    name: "Jo",
    role: "",
    seniority: "",
  });
});

test("nameMatches gates the delete confirm — trimmed, case-insensitive, never on empty", () => {
  assert.equal(nameMatches("Brandy", "Brandy"), true);
  assert.equal(nameMatches("  brandy ", "Brandy"), true); // trim + case-insensitive
  assert.equal(nameMatches("Brand", "Brandy"), false); // partial doesn't count
  assert.equal(nameMatches("", "Brandy"), false); // empty never matches
  assert.equal(nameMatches("   ", "Brandy"), false);
  assert.equal(nameMatches("Brandy", ""), false); // no target, no match
  assert.equal(nameMatches(null, null), false);
});
