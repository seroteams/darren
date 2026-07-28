// The three-state first-visit answer. Moved here from the customer app's rail tests
// (empty-states Phase 1, 2026-07-28): the rail no longer asks the question, but Home's
// first-run welcome still does, so the module's own contract still needs guarding.
//
// The state that matters is the middle one: `null` means nobody has asked yet, and it
// is NOT the same as "no". Only a positive no counts as a first visit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setHasRealRuns, isFirstVisit, onFirstVisitChange, forgetFirstVisit, resetFirstVisit } from "./first-visit.ts";

test("an unanswered question is not a first visit", () => {
  resetFirstVisit();
  assert.equal(isFirstVisit(), false, "unknown is not the same as no");
});

test("only a positive no counts, and a first brief clears it again", () => {
  resetFirstVisit();
  setHasRealRuns(false);
  assert.equal(isFirstVisit(), true, "no real 1:1s: first visit");
  setHasRealRuns(true);
  assert.equal(isFirstVisit(), false, "the first real 1:1 ends it");
});

test("listeners are told when the answer changes, and only when it changes", () => {
  resetFirstVisit();
  let calls = 0;
  onFirstVisitChange(() => { calls++; });
  setHasRealRuns(false);
  setHasRealRuns(false);
  assert.equal(calls, 1, "a repeat of the same answer is not a change");
  setHasRealRuns(true);
  assert.equal(calls, 2, "a real change notifies");
});

test("forgetting is not the same as answering no", () => {
  resetFirstVisit();
  let calls = 0;
  onFirstVisitChange(() => { calls++; });
  forgetFirstVisit();
  assert.equal(calls, 0, "already unknown: nothing to tell");
  setHasRealRuns(false);
  forgetFirstVisit();
  assert.equal(calls, 2, "no, then unknown again: two real changes");
  assert.equal(isFirstVisit(), false, "unknown is never a first visit");
});
