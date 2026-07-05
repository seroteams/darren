// The shared relative-time helper (cleanup-audit Phase 3) — one copy for the
// four stages that used to hand-roll it (compare, runs, team, person-detail).
import test from "node:test";
import assert from "node:assert/strict";
import { relTime, formatDate } from "./time.ts";

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

// formatDate (manager-ready Phase 2): the one date format everywhere —
// "Mon 18 Nov 2024" — independent of the browser's locale.
test("formatDate: renders 'Mon 18 Nov 2024' style, locale-proof", () => {
  // 2024-11-18 was a Monday. Use a local-noon date to dodge timezone edges.
  const monday = new Date(2024, 10, 18, 12, 0, 0).getTime();
  assert.equal(formatDate(monday), "Mon 18 Nov 2024");
  const sunday = new Date(2026, 6, 5, 12, 0, 0).getTime(); // 2026-07-05, a Sunday
  assert.equal(formatDate(sunday), "Sun 5 Jul 2026");
});

test("formatDate: falsy or invalid input renders as nothing", () => {
  assert.equal(formatDate(0), "");
  assert.equal(formatDate(NaN), "");
});
