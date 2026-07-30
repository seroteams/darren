import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orderForCheckin, allTapped, tappedOutcomes } from "./promise-checkin.ts";

// Card zero (Promises loop phase 2): last time's promises, manager's own FIRST
// (the design verdict 2026-07-12 — leaders model accountability by going first).
// From action-review-placement P1 the card no longer GATES: it is reached only
// by choice from the walk-in card, so it must never trap the manager inside it.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, "promise-checkin.ts"), "utf8");

const p = (id: string, owner: "manager" | "report") => ({ id, owner, action: `do ${id}`, when: "", outcome: null, at: 1 });

test("orderForCheckin puts the manager's own promises first, keeping each side's order", () => {
  const ordered = orderForCheckin([p("r1", "report"), p("m1", "manager"), p("r2", "report"), p("m2", "manager")]);
  assert.deepEqual(ordered.map((x) => x.id), ["m1", "m2", "r1", "r2"]);
});

test("allTapped still describes the complete state", () => {
  const promises = [p("a", "manager"), p("b", "report")];
  assert.equal(allTapped(promises, {}), false);
  assert.equal(allTapped(promises, { a: "yes" }), false);
  assert.equal(allTapped(promises, { a: "yes", b: "changed" }), true);
  assert.equal(allTapped([], {}), false); // an empty card never shows — no vacuous pass
});

// The honesty rule: an untapped promise is not an answer. It is simply not sent,
// so it stays open on the prior run exactly as skipping the card leaves it.
test("only tapped promises are sent: an untouched one is never given an outcome", () => {
  const promises = [p("a", "manager"), p("b", "report"), p("c", "report")];
  assert.deepEqual(tappedOutcomes(promises, { a: "yes", c: "no" }), [
    { id: "a", outcome: "yes" },
    { id: "c", outcome: "no" },
  ]);
  assert.deepEqual(tappedOutcomes(promises, {}), [], "nothing tapped, nothing claimed");
});

test("the start control is never disabled: the card is a choice, not a trap", () => {
  assert.ok(!/disabled:\s*true/.test(SRC), "no button ships disabled");
  assert.ok(!/startBtn\.disabled\s*=\s*!allTapped/.test(SRC), "the all-tapped gate is gone");
});
