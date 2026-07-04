// The shared relative-time helper (cleanup-audit Phase 3) — one copy for the
// four stages that used to hand-roll it (compare, runs, team, person-detail).
import test from "node:test";
import assert from "node:assert/strict";
import { relTime } from "./time.ts";

const MIN = 60_000;

test("relTime: falsy input renders as nothing", () => {
  assert.equal(relTime(0), "");
});

test("relTime: under a minute is 'just now'", () => {
  assert.equal(relTime(Date.now() - 20_000), "just now");
});

test("relTime: minutes, hours, days", () => {
  assert.equal(relTime(Date.now() - 5 * MIN), "5m ago");
  assert.equal(relTime(Date.now() - 3 * 60 * MIN), "3h ago");
  assert.equal(relTime(Date.now() - 2 * 24 * 60 * MIN), "2d ago");
});

test("relTime: boundaries round the way the stages always did", () => {
  // 59.4 min rounds to 59m; 12h30m rounds to 13h (Math.round semantics preserved).
  assert.equal(relTime(Date.now() - 59.4 * MIN), "59m ago");
  assert.equal(relTime(Date.now() - 12.5 * 60 * MIN), "13h ago");
});
