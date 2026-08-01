import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openActionCount, priorActionsKey } from "./prior-actions.ts";

// action-review-placement: last time's still-open actions, read once per 1:1.
// The read is fenced and decided server-side; this module only caches it, and the
// cache is what lets a LATER stage (the recap step in the feels-off arc) still see
// them after the server has stopped handing them back.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, "prior-actions.ts"), "utf8");

test("openActionCount copes with every shape the read can return", () => {
  assert.equal(openActionCount(null), 0);
  assert.equal(openActionCount(undefined), 0);
  assert.equal(openActionCount({ sessionId: "s", when: 1, promises: [] }), 0);
  assert.equal(openActionCount({ sessionId: "s", when: 1, promises: [{}, {}, {}] as never }), 3);
});

test("the cache is keyed per 1:1, so two meetings never share one", () => {
  assert.equal(priorActionsKey("abc"), "sero.prioractions.abc");
  assert.notEqual(priorActionsKey("abc"), priorActionsKey("def"));
});

test("a failed read is never cached, so the next stage gets to try again", () => {
  assert.match(SRC, /console\.warn\("\[prior-actions\] read failed[\s\S]{0,120}return null;/, "returns before writeCache");
});

test("a broken store degrades to nothing open and never blocks a 1:1", () => {
  assert.match(SRC, /catch \{\s*return undefined;/, "an unreadable cache hands on nothing");
  assert.match(SRC, /catch \{\s*\/\* storage blocked/, "an unwritable cache is not an error");
});

// Two 1:1s with the SAME person can be open in one tab. If the boot read trusted the
// cache, the second one would offer actions the first had already closed off.
test("the boot read always asks the server; the cache is written once and never re-read there", () => {
  assert.match(SRC, /await getPriorPromises\(id\)/, "boot goes to the server");
  assert.ok(!/loadPriorActions[\s\S]*cachedPriorActions\(/.test(SRC), "boot never reads the cache");
  assert.match(SRC, /getItem\(key\) !== null\) return;/, "the first read wins, later ones cannot overwrite it");
});
