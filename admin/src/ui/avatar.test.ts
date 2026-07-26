// Unit tests for the one initials helper (component-consolidation P2). These are real
// unit tests, not source guards: initialOf / initialsOf are pure string functions, so
// this runner (node:test, no DOM) can exercise them directly.
//
// The cases that matter are the ones the old nine copies disagreed on: one-word names,
// punctuation-heavy test-account names, and empty input.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initialOf, initialsOf } from "./avatar.ts";

test("initialOf: one letter for a person's own avatar", () => {
  assert.equal(initialOf("Priya Raman"), "P");
  assert.equal(initialOf("dan"), "D");
  assert.equal(initialOf("  spaced  "), "S");
});

test("initialOf: falls back to ? rather than rendering an empty circle", () => {
  assert.equal(initialOf(""), "?");
  assert.equal(initialOf("   "), "?");
  assert.equal(initialOf(null), "?");
  assert.equal(initialOf(undefined), "?");
});

test("initialsOf: first and last initial for a multi-word name", () => {
  assert.equal(initialsOf("Priya Raman"), "PR");
  assert.equal(initialsOf("Web Courses Bangkok"), "WB");
  assert.equal(initialsOf("mary jane watson"), "MW");
});

test("initialsOf: a one-word name gives its first TWO letters, not the same letter twice", () => {
  // This is the drift being settled. Team rendered "KK" and Pulse rendered "K", for one person.
  assert.equal(initialsOf("Keep"), "KE");
  assert.equal(initialsOf("dan"), "DA");
});

test("initialsOf: punctuation in test-account names does not leak into the circle", () => {
  assert.equal(initialsOf("qa-overnight"), "QA");
  assert.equal(initialsOf("deltest-1783605298910"), "DE");
  assert.equal(initialsOf("j.r ewing"), "JE");
});

test("initialsOf: falls back to ? rather than rendering an empty circle", () => {
  assert.equal(initialsOf(""), "?");
  assert.equal(initialsOf("   "), "?");
  assert.equal(initialsOf(null), "?");
  assert.equal(initialsOf(undefined), "?");
});

test("initialsOf: a name with no letters or digits still shows something", () => {
  assert.equal(initialsOf("!!"), "!!");
});

// The consolidation half: no screen may keep its own copy.
const SITES = [
  "../stages/runs.ts",
  "../stages/start-core.js",
  "../stages/admin-user-detail.ts",
  "../stages/admin-feedback.ts",
  "../stages/admin-pulse.ts",
  "./recap-header.ts",
  "./profile-badge.js",
  "../../../frontend/src/stages/team-card.ts",
];

test("no screen defines its own initials helper any more", () => {
  for (const rel of SITES) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.ok(
      !/function initialOf|const initials\s*=|function initials\s*\(/.test(src),
      `${rel} still has its own initials helper. Import it from ui/avatar.ts instead.`,
    );
    assert.match(
      src,
      /avatar\.ts"/,
      `${rel} does not import ui/avatar.ts.`,
    );
  }
});
