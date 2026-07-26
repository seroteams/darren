import { test } from "node:test";
import assert from "node:assert/strict";
import { SECTORS, isKnownSector, findSector } from "./sectors.ts";

// The catalogue is user-facing copy AND a set of stored keys, so it carries two duties:
// the labels have to read cleanly in a type-to-select box, and the ids have to stay put
// forever (an org row already holds one).

test("the catalogue is big enough to cover a modern workforce", () => {
  assert.ok(SECTORS.length >= 60, `expected a broad list, got ${SECTORS.length}`);
});

test("every id is unique, stable-looking, and every label is unique", () => {
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const s of SECTORS) {
    assert.match(s.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${s.id} is not lower-kebab`);
    assert.equal(ids.has(s.id), false, `duplicate id: ${s.id}`);
    // Duplicate labels would make typing ambiguous: two rows, one thing typed.
    assert.equal(labels.has(s.label.toLowerCase()), false, `duplicate label: ${s.label}`);
    ids.add(s.id);
    labels.add(s.label.toLowerCase());
  }
});

test("the original fifteen ids still resolve, so no stored sector is orphaned", () => {
  const original = [
    "technology", "financial-services", "healthcare", "education", "retail",
    "manufacturing", "professional-services", "media", "public-sector", "non-profit",
    "hospitality", "construction", "transport", "energy", "other",
  ];
  for (const id of original) assert.ok(isKnownSector(id), `${id} no longer exists`);
});

test("no label carries a dash character (house copy rule)", () => {
  for (const s of SECTORS) {
    assert.equal(/[—–]/.test(s.label), false, `dash in: ${s.label}`);
  }
});

test('"Something else" is last, so the catch-all never sits mid-list', () => {
  assert.equal(SECTORS[SECTORS.length - 1]?.id, "other");
});

test("everything above the catch-all is in alphabetical order", () => {
  const labels = SECTORS.slice(0, -1).map((s) => s.label);
  const sorted = [...labels].sort((a, b) => a.localeCompare(b, "en"));
  assert.deepEqual(labels, sorted);
});

// --- findSector: what turns what someone TYPED into a stored id ------------------------

test("findSector matches a label exactly", () => {
  assert.equal(findSector("Cybersecurity")?.id, "cybersecurity");
});

test("findSector ignores case and surrounding space", () => {
  assert.equal(findSector("  cYbErSeCuRiTy  ")?.id, "cybersecurity");
});

test("findSector also accepts a stored id, so a round-trip never breaks", () => {
  assert.equal(findSector("public-sector")?.id, "public-sector");
});

test("findSector returns null for blank or unrecognised text", () => {
  assert.equal(findSector(""), null);
  assert.equal(findSector("   "), null);
  assert.equal(findSector("underwater basket weaving"), null);
});

test("every label round-trips through findSector back to its own id", () => {
  for (const s of SECTORS) assert.equal(findSector(s.label)?.id, s.id);
});
