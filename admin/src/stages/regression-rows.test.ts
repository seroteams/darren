import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boardSummary,
  committeeCell,
  kindChip,
  lastRerunCell,
  batchProgressLine,
  rerunLabel,
  reviewCell,
  thinAnswerNote,
  trustCell,
  trustDetail,
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

const fmt = (at: number) => `at ${at}`;

function rerun(over: Partial<NonNullable<BoardCase["lastRerun"]>> = {}) {
  return { runId: "r1", batchId: "b1", finishedAt: 1_700_000_000, ...over };
}

test("a case that has never been rerun says so in every cell", () => {
  const c = boardCase();
  assert.deepEqual(lastRerunCell(c, fmt), { label: "Never rerun", tone: "muted" });
  assert.equal(trustCell(c).label, "·");
  assert.equal(committeeCell(c).label, "·");
  assert.equal(reviewCell(c).label, "·");
});

test("a rerun with no grade says so rather than implying a pass", () => {
  const c = boardCase({ lastRerun: rerun() });
  assert.deepEqual(lastRerunCell(c, fmt), { label: "at 1700000000", tone: "ok" });
  assert.deepEqual(trustCell(c), { label: "Not graded", tone: "muted" });
  assert.equal(reviewCell(c).label, "Not reviewed");
});

test("a clean rerun reads OK, and names nothing", () => {
  const c = boardCase({
    lastRerun: rerun({ grade: { actual: { verdict: "PASS", hard_fails: [] }, regressed: false } }),
  });
  assert.deepEqual(trustCell(c), { label: "OK", tone: "ok" });
  assert.deepEqual(trustDetail(c), []);
});

test("a regressed rerun names the checks that broke", () => {
  const c = boardCase({
    lastRerun: rerun({
      grade: {
        actual: { verdict: "FAIL", hard_fails: ["PRIVATE_NOTE_LEAK"] },
        expected: { verdict: "PASS", hard_fails: [] },
        newHardFails: ["PRIVATE_NOTE_LEAK"],
        regressed: true,
      },
    }),
  });
  assert.deepEqual(trustCell(c), { label: "Regressed", tone: "bad" });
  assert.deepEqual(trustDetail(c), ["PRIVATE_NOTE_LEAK"]);
});

test("regressing on the verdict alone still explains itself", () => {
  const c = boardCase({
    lastRerun: rerun({
      grade: {
        actual: { verdict: "WARN", hard_fails: [] },
        expected: { verdict: "PASS", hard_fails: [] },
        newHardFails: [],
        regressed: true,
      },
    }),
  });
  assert.deepEqual(trustDetail(c), ["verdict went from PASS to WARN"]);
});

test("running out of canned answers is surfaced, not swallowed", () => {
  const thin = boardCase({ answerCount: 4, lastRerun: rerun({ grade: { answersRanOut: true } }) });
  assert.match(thinAnswerNote(thin), /4 canned answers/);
  assert.match(thinAnswerNote(thin), /skipped/);
  assert.equal(thinAnswerNote(boardCase({ lastRerun: rerun() })), "");
});

test("Carl's own review status reads through to the row", () => {
  const withReview = (review: Record<string, string>) => boardCase({ lastRerun: rerun({ review }) });
  assert.equal(reviewCell(withReview({ reviewStatus: "partial" })).label, "Part-reviewed");
  assert.deepEqual(reviewCell(withReview({ reviewStatus: "complete", reviewOverall: "keep" })), { label: "Keep", tone: "ok" });
  assert.deepEqual(reviewCell(withReview({ reviewStatus: "complete", reviewOverall: "block" })), { label: "Block", tone: "bad" });
});

test("the batch line names the case, and only counts when there are several", () => {
  assert.equal(batchProgressLine({ caseId: "leak-devon", caseIndex: 1, caseTotal: 1 }), "leak-devon");
  assert.equal(batchProgressLine({ caseId: "thin-sam", caseIndex: 3, caseTotal: 8 }), "Case 3 of 8: thin-sam");
  assert.equal(batchProgressLine({ caseId: null }), "");
});

test("adversarial cases are chipped, happy ones are not", () => {
  assert.equal(kindChip("adversarial"), "adversarial");
  assert.equal(kindChip("happy"), "");
});

test("the rerun control states its cost, or says reruns are off", () => {
  assert.match(rerunLabel(true), /\$0\.35/);
  assert.equal(rerunLabel(false), "Reruns are off here");
});

test("the summary line counts what has not been rerun", () => {
  assert.equal(boardSummary([]), "No test cases found.");
  assert.equal(boardSummary([boardCase(), boardCase()]), "2 test cases, none rerun yet.");
  const done = boardCase({ lastRerun: rerun() });
  assert.equal(boardSummary([done, boardCase()]), "2 test cases, 1 not rerun yet.");
  assert.equal(boardSummary([done]), "1 test cases, all rerun.");
});
