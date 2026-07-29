// What the customer rail shows, and to whom (empty-states Phase 1, 2026-07-28).
//
// This replaces the "quiet rail" guards. That feature hid a new manager's work rows
// until their first 1:1, so signing in for the first time gave you Log out, What is
// Sero? and Send feedback and nothing else: the app read as broken rather than new.
// Each destination now carries its own empty state instead, so the rail stays whole
// from day one and these guards hold that line.
//
// The shell checks below are inherited from the old file and still earn their place:
// the customer app's profile chip hides its own Log out, so the rail's is the only
// one in the app, and What is Sero? / Send feedback have no other entrance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const navJs = readFileSync(new URL("./app-nav.js", import.meta.url), "utf8");

test("a row is shown by audience alone, and nothing else may hide it", () => {
  assert.match(
    navJs,
    /b\.hidden = b\.dataset\[wanted\] !== "1";/,
    "audience is the only test",
  );
  assert.match(
    navJs,
    /alwaysShown = new Set\(\["logout", "about", "feedback"\]\)/,
    "Log out, What is Sero? and Send feedback are never hidden",
  );
});

test("the first-visit answer can never reach the rail again", () => {
  assert.doesNotMatch(navJs, /isFirstVisit/, "the rail does not ask the question");
  assert.doesNotMatch(navJs, /const quiet/, "no quiet gate left to switch back on");
  assert.doesNotMatch(navJs, /onFirstVisitChange/, "and nothing re-renders it on the answer");
});

test("a manager's four work rows are all in the rail", () => {
  for (const key of ["mghome", "mgnew", "mgteam", "mgruns"]) {
    assert.match(navJs, new RegExp(`js-nav-${key}|key: "${key}"`), `${key} exists`);
  }
});

test("Members has no way back into the rail", () => {
  // Two people lists read as a mistake to a manager, and Team already owns per-person access
  // (invite / link / remove). The /members screen still answers at its URL; nothing links it.
  assert.doesNotMatch(navJs, /mgmembers/, "no Members row, handler or active-state entry");
  assert.doesNotMatch(navJs, /STAGES\.MEMBERS/, "the rail never routes to the Members stage");
});

test("logging out still forgets the answer, for Home's first-run welcome", () => {
  // first-visit.ts outlives any one signed-in manager: logging out of the customer app
  // is pure SPA, with no reload to clear it. The rail no longer cares, but Home's hero
  // does, so the next person in must not inherit the last one's answer.
  const logout = navJs.slice(navJs.indexOf("async function onLogout"));
  assert.match(logout.slice(0, 500), /forgetFirstVisit\(\)/, "the rail's own Log out clears it");
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
  const profile = readFileSync(new URL("../../../admin/src/ui/profile-badge.js", import.meta.url), "utf8");
  assert.match(profile, /logoutItem\.hidden = customerSurface/, "the chip still has no Log out of its own");
});
