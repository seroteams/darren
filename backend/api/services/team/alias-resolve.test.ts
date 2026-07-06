import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeKey, canonicalKeyOf, aliasedPersonName } from "./alias-resolve.ts";
import type { PeopleAliases } from "./team.repo.ts";

// The pure core of the people backfill (people-roster Phase 3): given a manager's
// alias sidecar and a run's free-typed name, decide the single display name to file
// that run's person under — so every run for one person lands on one roster row,
// honouring the manager's earlier Team merges/renames. No database, no filesystem.

const aliases = (over: Partial<PeopleAliases> = {}): PeopleAliases => ({
  merges: {},
  names: {},
  ...over,
});

test("normalizeKey trims and lower-cases (the Team grouping key)", () => {
  assert.equal(normalizeKey("  Grace "), "grace");
  assert.equal(normalizeKey("DANIEL"), "daniel");
  assert.equal(normalizeKey(null), "");
});

test("no aliases: keeps the original name, just trimmed", () => {
  assert.equal(aliasedPersonName(aliases(), "  Grace "), "Grace");
});

test("a merged name folds onto its canonical key", () => {
  const a = aliases({ merges: { danny: "daniel" } });
  assert.equal(canonicalKeyOf(a, "Danny"), "daniel");
  assert.equal(aliasedPersonName(a, "Danny"), "daniel");
});

test("a display-name override wins over the raw name", () => {
  const a = aliases({ names: { daniel: "Daniel Lee" } });
  assert.equal(aliasedPersonName(a, "Daniel"), "Daniel Lee");
});

test("override is applied through a merge (merged name → canonical → override)", () => {
  const a = aliases({ merges: { danny: "daniel" }, names: { daniel: "Daniel Lee" } });
  assert.equal(aliasedPersonName(a, "Danny"), "Daniel Lee");
});

test("merge chains collapse to the final canonical key", () => {
  const a = aliases({ merges: { a: "b", b: "c" } });
  assert.equal(canonicalKeyOf(a, "A"), "c");
  assert.equal(aliasedPersonName(a, "A"), "c");
});

test("a merge loop terminates (guarded) instead of hanging", () => {
  const a = aliases({ merges: { x: "y", y: "x" } });
  const k = canonicalKeyOf(a, "x");
  assert.ok(k === "x" || k === "y");
});

test("names that differ only by case/whitespace resolve to the same target", () => {
  const a = aliases({ merges: { danny: "daniel" } });
  // The dedupe invariant the backfill relies on: same canonical → same filed name.
  assert.equal(aliasedPersonName(a, "Danny"), aliasedPersonName(a, "  danny "));
});
