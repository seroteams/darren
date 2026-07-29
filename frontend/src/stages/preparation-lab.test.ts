import { test } from "node:test";
import assert from "node:assert/strict";
import { leadClause } from "./preparation-lab.ts";

// The Bento listen-for card bolds the lead clause of each item so it can be
// scanned mid-conversation. Emphasis only: lead + rest must always rebuild the
// original item, and a sentence with no sensible split gets no bold at all
// rather than a mis-cut one.

test("splits a two-sentence item at the first sentence end", () => {
  const { lead, rest } = leadClause("Two concrete outcomes. Not a full status dump.");
  assert.equal(lead, "Two concrete outcomes.");
  assert.equal(rest, "Not a full status dump.");
});

test("falls back to the first comma when there is only one sentence", () => {
  const { lead, rest } = leadClause(
    "Whether he names two outcomes, and whether he gives a clear time window.",
  );
  assert.equal(lead, "Whether he names two outcomes,");
  assert.equal(rest, "and whether he gives a clear time window.");
});

test("leaves a single unbroken sentence unemphasised rather than mis-cutting it", () => {
  const item = "Whether he names two concrete outcomes and a clear time window without drifting.";
  const { lead, rest } = leadClause(item);
  assert.equal(lead, "");
  assert.equal(rest, item);
});

test("ignores a split that would land too early or too late", () => {
  const early = leadClause("No. Everything else follows here.");
  assert.equal(early.lead, "", "a 3-character lead is not a lead");
  const late = leadClause(`${"word ".repeat(30)}tail, and the rest of it.`);
  assert.equal(late.lead, "", "a 150-character lead is the whole line");
});

test("lead and rest always rebuild the original item", () => {
  const items = [
    "One thing. Then another thing entirely.",
    "A single clause with no break in it at all here",
    "Whether he volunteers a tradeoff, across scope or cadence.",
  ];
  for (const item of items) {
    const { lead, rest } = leadClause(item);
    const rebuilt = lead ? `${lead} ${rest}` : rest;
    assert.equal(rebuilt, item, `round-trips: ${item}`);
  }
});
