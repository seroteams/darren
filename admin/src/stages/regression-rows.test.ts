import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boardSummary,
  committeeCell,
  kindChip,
  lastRerunCell,
  rerunLabel,
  reviewCell,
  trustCell,
} from "./regression-rows.ts";
import type { BoardCase } from "./regression-rows.ts";

function boardCase(over: Partial<BoardCase> = {}): BoardCase {
  return {
    id: "leak-devon",
    name: "Devon",
    meetingType: "Growth & career plan",
    kind: "adversarial",
    expect: { verdict: "PASS", hard_fails: [] },
    answerCount: 9,
    lastRerun: null,
    ...over,
  };
}

const fmt = (iso: string) => `on ${iso.slice(0, 10)}`;

test("a case that has never been rerun says so in every cell", () => {
  const c = boardCase();
  assert.deepEqual(lastRerunCell(c, fmt), { label: "Never rerun", tone: "muted" });
  assert.equal(trustCell(c).label, "·");
  assert.equal(committeeCell(c).label, "·");
  assert.equal(reviewCell(c).label, "·");
});

test("a rerun case shows its date and stops claiming a verdict it has not earned", () => {
  const c = boardCase({ lastRerun: { runId: "r1", batchId: "b1", finishedAt: "2026-07-31T14:32:00Z" } });
  assert.deepEqual(lastRerunCell(c, fmt), { label: "on 2026-07-31", tone: "ok" });
  assert.equal(trustCell(c).tone, "muted");
  assert.equal(reviewCell(c).label, "Not reviewed");
});

test("adversarial cases are chipped, happy ones are not", () => {
  assert.equal(kindChip("adversarial"), "adversarial");
  assert.equal(kindChip("happy"), "");
});

test("the rerun control states its cost, or says reruns are off", () => {
  assert.match(rerunLabel(true), /\$0\.45/);
  assert.equal(rerunLabel(false), "Reruns are off here");
});

test("the summary line counts what has not been rerun", () => {
  assert.equal(boardSummary([]), "No test cases found.");
  assert.equal(boardSummary([boardCase(), boardCase()]), "2 test cases, none rerun yet.");
  const done = boardCase({ lastRerun: { runId: "r", batchId: "b", finishedAt: "2026-07-31T00:00:00Z" } });
  assert.equal(boardSummary([done, boardCase()]), "2 test cases, 1 not rerun yet.");
  assert.equal(boardSummary([done]), "1 test cases, all rerun.");
});
