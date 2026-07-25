// The shared relative-time helper (cleanup-audit Phase 3) — one copy for the
// four stages that used to hand-roll it (compare, runs, team, person-detail).
import test from "node:test";
import assert from "node:assert/strict";
import { relTime, formatDate, whenLabel, whenLabelsFor } from "./time.ts";

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

// whenLabel (home-screen-truth Phase 1): the list vocabulary — relative inside the
// week, then the one date format. Was hand-rolled twice (start-core, runs).
const DAY = 24 * 60 * MIN;

test("whenLabel: inside the week reads relative", () => {
  assert.equal(whenLabel(Date.now() - 6 * DAY), "6d ago");
  assert.equal(whenLabel(Date.now() - 3 * 60 * MIN), "3h ago");
});

test("whenLabel: past the week falls back to the one date format", () => {
  const eightDaysAgo = Date.now() - 8 * DAY;
  assert.equal(whenLabel(eightDaysAgo), formatDate(eightDaysAgo));
  assert.match(whenLabel(eightDaysAgo), /^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} \d{4}$/);
});

test("whenLabel: falsy input renders as nothing", () => {
  assert.equal(whenLabel(0), "");
});

// whenLabelsFor (audit F11): one vocabulary per COLUMN. Row-by-row, a list ended up with
// "5d ago" directly above "Fri 17 Jul 2026", so two rows could not be compared by eye.
test("whenLabelsFor: everything relative while the whole list is inside the week", () => {
  const list = [Date.now() - 2 * DAY, Date.now() - 5 * DAY, Date.now() - 6 * DAY];
  const when = whenLabelsFor(list);
  assert.deepEqual(list.map(when), ["2d ago", "5d ago", "6d ago"]);
});

test("whenLabelsFor: one entry past the week turns the WHOLE list absolute", () => {
  const recent = Date.now() - 2 * DAY;
  const old = Date.now() - 20 * DAY;
  const when = whenLabelsFor([recent, old]);
  assert.equal(when(recent), formatDate(recent), "the recent row goes absolute too");
  assert.equal(when(old), formatDate(old));
  assert.notEqual(when(recent), "2d ago", "no mixed vocabulary in one column");
});

test("whenLabelsFor: an empty or all-falsy list still returns a usable formatter", () => {
  assert.equal(whenLabelsFor([])(0), "");
  const stamp = Date.now() - 3 * DAY;
  assert.equal(whenLabelsFor([0, 0])(stamp), formatDate(stamp), "no stamps to judge by, so absolute");
});

test("whenLabelsFor: falsy input renders as nothing", () => {
  assert.equal(whenLabelsFor([Date.now()])(0), "");
});
