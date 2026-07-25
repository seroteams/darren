// The quiet rail (onboarding-firstrun Phase 3). Before a manager has run a single 1:1,
// the rail carries no work rows: seven doors on day one is the thing the onboarding
// committee flagged, and the brief-first welcome is meant to be the only way in.
//
// What must NOT happen is the app losing its shell with it. The subtraction audit found
// that hiding the rail outright would take the customer app's ONLY Log out button with
// it, and orphan What is Sero? and Send feedback, which no other screen links to. So the
// rows go quiet and the shell stays. These guards hold that line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setHasRealRuns, isFirstVisit, onFirstVisitChange, resetFirstVisit } from "../../../admin/src/ui/first-visit.ts";

const navJs = readFileSync(new URL("./app-nav.js", import.meta.url), "utf8");

test("an unanswered question never quiets the rail", () => {
  resetFirstVisit();
  assert.equal(isFirstVisit(), false, "unknown is not the same as no");
});

test("only a positive no quiets it, and a first brief un-quiets it again", () => {
  resetFirstVisit();
  setHasRealRuns(false);
  assert.equal(isFirstVisit(), true, "no real 1:1s: quiet");
  setHasRealRuns(true);
  assert.equal(isFirstVisit(), false, "the first real 1:1 brings the rail back");
});

test("the rail is told when the answer changes, and only when it changes", () => {
  resetFirstVisit();
  let calls = 0;
  onFirstVisitChange(() => { calls++; });
  setHasRealRuns(false);
  setHasRealRuns(false);
  assert.equal(calls, 1, "a repeat of the same answer is not a change");
  setHasRealRuns(true);
  assert.equal(calls, 2, "a real change re-renders the rail");
});

test("the rail quiets the manager work rows and nothing else", () => {
  assert.match(navJs, /isFirstVisit\(\)/, "the rail asks the shared question");
  assert.match(navJs, /const quiet = wanted === "mgr" && isFirstVisit\(\)/, "managers only: a member's rail is already one row");
  assert.match(navJs, /b\.hidden = b\.dataset\[wanted\] !== "1" \|\| quiet/, "the work rows go with it");
  assert.match(navJs, /alwaysShown = new Set\(\["logout", "about", "feedback"\]\)/, "Log out, What is Sero? and Send feedback are never hidden");
});

test("the shell survives: brand, collapse, mobile bar and Log out are untouched", () => {
  for (const [what, re] of [
    ["Log out button", /js-logout/],
    ["brand button", /js-home/],
    ["mobile brand", /js-bar-home/],
    ["mobile menu", /js-menu/],
    ["collapse toggle", /js-collapse/],
  ] as const) {
    assert.match(navJs, re, `${what} still exists`);
  }
  // The customer app's profile chip deliberately hides its own Log out, so the rail's
  // is the only one. Hiding the whole rail would have stranded every manager.
  const profile = readFileSync(new URL("../../../admin/src/ui/profile-badge.js", import.meta.url), "utf8");
  assert.match(profile, /logoutItem\.hidden = customerSurface/, "the chip still has no Log out of its own");
});

test("the rail re-renders itself on the answer, without waiting for a state change", () => {
  assert.match(navJs, /onFirstVisitChange\(/, "it subscribes once");
  assert.match(navJs, /lastRender/, "and replays its last render args");
});
