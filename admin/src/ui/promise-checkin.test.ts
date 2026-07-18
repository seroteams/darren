import { test } from "node:test";
import assert from "node:assert/strict";
import { orderForCheckin, allTapped } from "./promise-checkin.ts";

// Card zero (Promises loop phase 2): last time's promises, manager's own FIRST
// (the design verdict 2026-07-12 — leaders model accountability by going first),
// and the start gate only opens once every promise has a tap.

const p = (id: string, owner: "manager" | "report") => ({ id, owner, action: `do ${id}`, when: "", outcome: null, at: 1 });

test("orderForCheckin puts the manager's own promises first, keeping each side's order", () => {
  const ordered = orderForCheckin([p("r1", "report"), p("m1", "manager"), p("r2", "report"), p("m2", "manager")]);
  assert.deepEqual(ordered.map((x) => x.id), ["m1", "m2", "r1", "r2"]);
});

test("allTapped gates on every promise having a chosen outcome", () => {
  const promises = [p("a", "manager"), p("b", "report")];
  assert.equal(allTapped(promises, {}), false);
  assert.equal(allTapped(promises, { a: "yes" }), false);
  assert.equal(allTapped(promises, { a: "yes", b: "changed" }), true);
  assert.equal(allTapped([], {}), false); // an empty card never shows — no vacuous pass
});
