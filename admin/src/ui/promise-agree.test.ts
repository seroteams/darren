import { test } from "node:test";
import assert from "node:assert/strict";
import { draftsFromNextActions, MAX_PROMISES } from "./promise-agree.ts";

// The promises moment (promises-before-recap) is seeded from the briefing's
// next_actions — engine SUGGESTIONS. This mapper shapes them into editable drafts;
// only what the manager locks in gets stored (no-inference ruling). Tests carried
// over from promise-confirm (superseded 2026-07-19).

test("maps briefing next_actions into manager-owned drafts, trimmed", () => {
  const drafts = draftsFromNextActions([
    { when: "this week", action: "  Book the onboarding buddy " },
    { when: "next 1:1", action: "Revisit the workload concern" },
  ]);
  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts[0], { owner: "manager", action: "Book the onboarding buddy", when: "this week" });
  // Engine can't know owners — all drafts seed the manager's group; moving one
  // to the report's group is the manager's explicit call in the UI.
  assert.ok(drafts.every((d) => d.owner === "manager"));
});

test("drops malformed rows and handles junk input without throwing", () => {
  assert.deepEqual(draftsFromNextActions(null), []);
  assert.deepEqual(draftsFromNextActions("nope"), []);
  assert.deepEqual(draftsFromNextActions([null, { when: "today" }, { action: "   " }, 7]), []);
  const drafts = draftsFromNextActions([{ action: "Real one" }, { junk: true }]);
  assert.equal(drafts.length, 1);
  assert.deepEqual(drafts[0], { owner: "manager", action: "Real one", when: "" });
});

test("caps at 10 — matches the server's ceiling", () => {
  const many = Array.from({ length: 14 }, (_, i) => ({ when: "today", action: `a${i}` }));
  assert.equal(draftsFromNextActions(many).length, 10);
  assert.equal(MAX_PROMISES, 10);
});
