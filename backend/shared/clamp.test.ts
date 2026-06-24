import { test } from "node:test";
import assert from "node:assert/strict";
import { clamp } from "./clamp.ts";

test("caps a value above the max at the max", () => {
  assert.equal(clamp(12, 0, 10), 10);
});

test("raises a value below the min up to the min", () => {
  assert.equal(clamp(-3, 0, 10), 0);
});

test("leaves a value already in range untouched", () => {
  assert.equal(clamp(7, 0, 10), 7);
});
