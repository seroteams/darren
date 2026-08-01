import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { acquire, currentHolder, release, resetSlot } from "./engine-job-slot.ts";

beforeEach(() => resetSlot());

test("a free slot is taken and reports its holder", () => {
  assert.equal(currentHolder(), null);
  assert.equal(acquire("test-engine", () => 1000), null);
  assert.deepEqual(currentHolder(), { tool: "test-engine", startedAt: 1000 });
});

test("a second tool is turned away and told who holds it", () => {
  acquire("test-engine", () => 1000);
  const busy = acquire("regression", () => 2000);
  assert.deepEqual(busy, { tool: "test-engine", startedAt: 1000 });
  // The first holder still owns it — a refused acquire must not steal the slot.
  assert.equal(currentHolder()?.tool, "test-engine");
});

test("contention is symmetric: regression blocks the test engine too", () => {
  acquire("regression", () => 1000);
  assert.equal(acquire("test-engine", () => 2000)?.tool, "regression");
});

test("releasing frees it for the other tool", () => {
  acquire("test-engine", () => 1000);
  release("test-engine");
  assert.equal(currentHolder(), null);
  assert.equal(acquire("regression", () => 2000), null);
});

test("a stale finisher cannot release the slot a newer run holds", () => {
  acquire("test-engine", () => 1000);
  release("test-engine");
  acquire("regression", () => 2000);
  release("test-engine"); // the old run finally lands, late
  assert.equal(currentHolder()?.tool, "regression");
});

test("currentHolder hands back a copy, not the live slot", () => {
  acquire("regression", () => 1000);
  const snap = currentHolder()!;
  snap.tool = "tampered";
  assert.equal(currentHolder()?.tool, "regression");
});
