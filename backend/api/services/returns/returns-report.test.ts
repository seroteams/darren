import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReturnsReport, formatReturnsTable } from "./returns-report.ts";

const DAY = 24 * 60 * 60 * 1000;
const d0 = Date.UTC(2026, 6, 1); // 1 Jul 2026

// The Gate-1 question: did a manager come back on a separate day and prep another 1:1?
test("a manager active on two separate days counts as returned", () => {
  const [row] = buildReturnsReport({
    users: [{ id: "m1", name: "Priya", email: "p@x.com" }],
    logins: [{ userId: "m1", createdAt: d0 }],
    runs: [
      { userId: "m1", createdAt: d0, completedAt: d0 + 12 * 60000, finished: true },
      { userId: "m1", createdAt: d0 + 3 * DAY, completedAt: d0 + 3 * DAY + 8 * 60000, finished: true },
    ],
  });
  assert.equal(row!.returnedUnprompted, true);
  assert.equal(row!.daysActive, 2);
  assert.equal(row!.runsStarted, 2);
  assert.equal(row!.runsFinished, 2);
  assert.deepEqual(row!.gapDays, [3]);
  assert.equal(row!.medianPrepMinutes, 10); // median of 12 and 8
});

test("a one-day-only manager has not returned", () => {
  const [row] = buildReturnsReport({
    users: [{ id: "m2", name: "Sam", email: "s@x.com" }],
    logins: [{ userId: "m2", createdAt: d0 }],
    runs: [{ userId: "m2", createdAt: d0, completedAt: null, finished: false }],
  });
  assert.equal(row!.returnedUnprompted, false);
  assert.equal(row!.daysActive, 1);
  assert.equal(row!.runsFinished, 0);
  assert.equal(row!.medianPrepMinutes, null); // no finished run to time
});

test("a login with no run still marks a day active (returns without a fresh 1:1)", () => {
  const [row] = buildReturnsReport({
    users: [{ id: "m3", name: "Lee", email: "l@x.com" }],
    logins: [
      { userId: "m3", createdAt: d0 },
      { userId: "m3", createdAt: d0 + 5 * DAY },
    ],
    runs: [],
  });
  assert.equal(row!.daysActive, 2);
  assert.equal(row!.returnedUnprompted, true);
  assert.equal(row!.runsStarted, 0);
});

test("rows sort most-recently-active first; unknown user falls back to id", () => {
  const rows = buildReturnsReport({
    users: [{ id: "m1", name: "Priya", email: "p@x.com" }],
    logins: [
      { userId: "m1", createdAt: d0 },
      { userId: "mX", createdAt: d0 + 10 * DAY },
    ],
    runs: [],
  });
  assert.equal(rows[0]!.email, "mX"); // no user record → id as fallback, most recent first
  assert.equal(rows[1]!.name, "Priya");
});

test("the table renders and reports the returned count", () => {
  const out = formatReturnsTable(
    buildReturnsReport({
      users: [{ id: "m1", name: "Priya", email: "p@x.com" }],
      logins: [{ userId: "m1", createdAt: d0 }, { userId: "m1", createdAt: d0 + DAY }],
      runs: [],
    }),
  );
  assert.match(out, /1 of 1 manager/);
  assert.match(out, /Priya/);
});

test("empty input is a friendly message, not a crash", () => {
  assert.match(formatReturnsTable([]), /No managers/);
});
