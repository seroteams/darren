// Unit tests for the one pure-logic helper in admin-ui-2 (frontend-conventions:
// co-located, node:test — no DOM needed).
import test from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "./time-ago.ts";

const NOW = Date.parse("2026-07-12T12:00:00Z");

test("null or garbage reads as a quiet dash", () => {
  assert.equal(timeAgo(null, NOW), "—");
  assert.equal(timeAgo("not a date", NOW), "—");
});

test("under a minute is 'just now'", () => {
  assert.equal(timeAgo(NOW - 30_000, NOW), "just now");
});

test("minutes, hours, days", () => {
  assert.equal(timeAgo(NOW - 5 * 60_000, NOW), "5m ago");
  assert.equal(timeAgo(NOW - 3 * 3_600_000, NOW), "3h ago");
  assert.equal(timeAgo(NOW - 2 * 86_400_000, NOW), "2d ago");
});

test("beyond 14 days it switches to the house date format", () => {
  assert.equal(timeAgo("2026-06-01T09:00:00Z", NOW), "Mon 1 Jun 2026");
});

test("accepts ISO strings as well as epoch ms", () => {
  assert.equal(timeAgo("2026-07-12T11:00:00Z", NOW), "1h ago");
});
