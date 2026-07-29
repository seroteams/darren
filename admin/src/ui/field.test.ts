// swapField's promise is what intake.js awaits at the end of mount(), and boot-shell.js
// serialises every stage render through one chain — so if this promise never settles, the
// whole nav rail goes dead: the URL changes and the screen never does (console audit,
// 2026-07-29). requestAnimationFrame does not fire in a tab that isn't painting
// (backgrounded, session-restored), which is exactly how that happened. boot-shell.js
// already learned this for its own reveal; these tests hold the same line here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { swapField } from "./field.js";

type FakeNode = {
  classList: { add(c: string): void };
  classes: string[];
  parentNode: unknown;
  removed: boolean;
  remove(): void;
};

function fakeNode(): FakeNode {
  const classes: string[] = [];
  const node: FakeNode = {
    classes,
    classList: { add: (c: string) => { classes.push(c); } },
    parentNode: null,
    removed: false,
    remove() { node.removed = true; },
  };
  return node;
}

function fakeHost(child: FakeNode | null = null) {
  const appended: FakeNode[] = [];
  return { firstElementChild: child, appended, appendChild(n: FakeNode) { appended.push(n); } };
}

// Swap in a rAF that never calls back, the way a non-painting tab behaves.
async function withDeadRaf<T>(fn: () => Promise<T>): Promise<T> {
  const original = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame;
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = () => 0;
  try { return await fn(); } finally {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = original;
  }
}

test("resolves even when requestAnimationFrame never fires", async () => {
  await withDeadRaf(async () => {
    const next = fakeNode();
    const host = fakeHost();
    const settled = await Promise.race([
      swapField(host, () => next).then(() => "resolved"),
      new Promise((r) => setTimeout(() => r("hung"), 1000)),
    ]);
    assert.equal(settled, "resolved", "a non-painting tab must not hang the render chain");
  });
});

test("still resolves with an outgoing field to swap out", async () => {
  await withDeadRaf(async () => {
    const outgoing = fakeNode();
    const next = fakeNode();
    const host = fakeHost(outgoing);
    const settled = await Promise.race([
      swapField(host, () => next).then(() => "resolved"),
      new Promise((r) => setTimeout(() => r("hung"), 1000)),
    ]);
    assert.equal(settled, "resolved");
  });
});

test("resolves with the inserted node, and only once", async () => {
  let calls = 0;
  const next = fakeNode();
  const host = fakeHost();
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (cb: () => void) => { cb(); return 0; };
  const node = await swapField(host, () => { calls += 1; return next; });
  assert.equal(node, next, "callers focus the node this resolves with");
  assert.equal(calls, 1, "the field is rendered once, not once per reveal path");
  assert.deepEqual(host.appended, [next]);
});
