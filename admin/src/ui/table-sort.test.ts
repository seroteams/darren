import { test } from "node:test";
import assert from "node:assert/strict";
import { sortableHeader, sortRows } from "./table-sort.ts";

// Column sorting for the shared table (design-consolidation Phase 0): a pure <th>
// render with the js hook + direction state, and a pure sort helper. Hosts wire clicks.

test("renders a th with a button carrying the sort key", () => {
  const html = sortableHeader("Person", "name");
  assert.match(html, /<th[^>]*>/, "is a th");
  assert.match(html, /js-lt-sort[^>]*data-sort="name"/, "button carries the key");
  assert.ok(html.includes(">Person<"), "label rendered");
  assert.match(html, /aria-sort="none"/, "unsorted by default");
});

test("marks the active direction with aria-sort and a direction class", () => {
  const asc = sortableHeader("Person", "name", "asc");
  assert.match(asc, /aria-sort="ascending"/);
  assert.ok(asc.includes("lt-sort--asc"), "asc class for the caret");
  const desc = sortableHeader("Person", "name", "desc");
  assert.match(desc, /aria-sort="descending"/);
  assert.ok(desc.includes("lt-sort--desc"), "desc class for the caret");
});

test("escapes label and key", () => {
  const html = sortableHeader("<b>x</b>", '">k');
  assert.ok(!html.includes("<b>x</b>"), "label escaped");
  assert.ok(!html.includes('data-sort=""'), "key escaped");
});

test("sortRows sorts strings case-insensitively and numbers numerically, both directions", () => {
  const people = [{ n: "beth", a: 30 }, { n: "Al", a: 4 }, { n: "cy", a: 12 }];
  assert.deepEqual(sortRows(people, (p) => p.n, "asc").map((p) => p.n), ["Al", "beth", "cy"]);
  assert.deepEqual(sortRows(people, (p) => p.n, "desc").map((p) => p.n), ["cy", "beth", "Al"]);
  assert.deepEqual(sortRows(people, (p) => p.a, "asc").map((p) => p.a), [4, 12, 30]);
  assert.deepEqual(sortRows(people, (p) => p.a, "desc").map((p) => p.a), [30, 12, 4]);
});

test("sortRows does not mutate the input", () => {
  const rows = [{ v: 2 }, { v: 1 }];
  sortRows(rows, (r) => r.v, "asc");
  assert.deepEqual(rows.map((r) => r.v), [2, 1], "original order untouched");
});
