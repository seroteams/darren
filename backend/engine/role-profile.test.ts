import { test } from "node:test";
import assert from "node:assert/strict";
import { addHiddenTerm, removeHiddenTerm, mergeTerminology } from "./role-profile.ts";

// --- hidden list helpers (pure) -------------------------------------------

test("addHiddenTerm stores the term lowercased", () => {
  assert.deepEqual(addHiddenTerm([], "Quota"), ["quota"]);
});

test("addHiddenTerm dedupes case-insensitively", () => {
  assert.deepEqual(addHiddenTerm(["quota"], "QUOTA"), ["quota"]);
});

test("addHiddenTerm ignores blank input", () => {
  assert.deepEqual(addHiddenTerm(["quota"], "   "), ["quota"]);
});

test("removeHiddenTerm drops the term case-insensitively", () => {
  assert.deepEqual(removeHiddenTerm(["quota", "demo"], "QUOTA"), ["demo"]);
});

// --- runtime merge (what the engine actually uses) ------------------------

const base = [
  { term: "Quota", meaning: "Revenue target", group: "sales" },
  { term: "Demo", meaning: "Product walkthrough", group: "sales" },
];

test("mergeTerminology keeps base words when nothing is hidden", () => {
  assert.deepEqual(
    mergeTerminology(base, [], []).map((t) => t.term),
    ["Quota", "Demo"],
  );
});

test("mergeTerminology drops a hidden base word (case-insensitive)", () => {
  const out = mergeTerminology(base, [], ["quota"]).map((t) => t.term);
  assert.deepEqual(out, ["Demo"]);
});

test("mergeTerminology appends user-added words", () => {
  const out = mergeTerminology(base, [{ term: "Standup", meaning: "Daily sync" }], []);
  assert.deepEqual(out.map((t) => t.term), ["Quota", "Demo", "Standup"]);
});

test("mergeTerminology does not append a user word that duplicates a base word", () => {
  const out = mergeTerminology(base, [{ term: "quota", meaning: "dup" }], []);
  assert.deepEqual(out.map((t) => t.term), ["Quota", "Demo"]);
});

test("mergeTerminology never re-adds a hidden word via the overlay", () => {
  const out = mergeTerminology(base, [{ term: "Quota", meaning: "back" }], ["quota"]);
  assert.deepEqual(out.map((t) => t.term), ["Demo"]);
});
