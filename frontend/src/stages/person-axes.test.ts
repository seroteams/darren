import { test } from "node:test";
import assert from "node:assert/strict";
import { renderLastAxes, type AxisRead } from "./person-axes.ts";

// A full four-axis read: two read (one positive, one negative), two not read.
const MIXED: AxisRead[] = [
  { id: "wellbeing", score: null, read_status: "not_read" },
  { id: "engagement", score: 6, read_status: "read" },
  { id: "clarity", score: -5, read_status: "read" },
  { id: "growth", score: null, read_status: "not_read" },
];

test("read axes show their signed score with the axis label", () => {
  const html = renderLastAxes(MIXED, "4 days ago");
  assert.match(html, /Engagement<\/span> <b>\+6<\/b>/);
  assert.match(html, /Clarity<\/span> <b>-5<\/b>/);
});

test("a not-read axis shows 'not read', never a 0", () => {
  const html = renderLastAxes(MIXED, "4 days ago");
  assert.match(html, /Wellbeing<\/span> <b>not read<\/b>/);
  assert.match(html, /Growth<\/span> <b>not read<\/b>/);
  // The honesty guarantee: no zero stands in for an unread axis.
  assert.doesNotMatch(html, /Wellbeing<\/span> <b>0<\/b>/);
});

test("the dated 'Last 1:1' label carries the when", () => {
  assert.match(renderLastAxes(MIXED, "4 days ago"), /Last 1:1 · 4 days ago/);
});

test("a genuinely read score of 0 shows '0' — a read zero is real signal", () => {
  const html = renderLastAxes(
    [{ id: "clarity", score: 0, read_status: "read" }],
    "today",
  );
  assert.match(html, /Clarity<\/span> <b>0<\/b>/);
});

test("nothing was read → empty string (no empty scaffold)", () => {
  const allUnread: AxisRead[] = [
    { id: "wellbeing", score: null, read_status: "not_read" },
    { id: "engagement", score: null, read_status: "not_read" },
  ];
  assert.equal(renderLastAxes(allUnread, "1 week ago"), "");
});

test("no axes at all (undefined / missing) → empty string", () => {
  assert.equal(renderLastAxes(undefined, "today"), "");
  assert.equal(renderLastAxes(null, "today"), "");
  assert.equal(renderLastAxes([], "today"), "");
});

test("axes render in the canonical wellbeing→engagement→clarity→growth order", () => {
  const html = renderLastAxes(MIXED, "today");
  const order = ["Wellbeing", "Engagement", "Clarity", "Growth"].map((l) => html.indexOf(l));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});
