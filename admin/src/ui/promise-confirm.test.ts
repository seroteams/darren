import { test } from "node:test";
import assert from "node:assert/strict";
import { draftsFromNextActions } from "./promise-confirm.ts";

// The wrap-up confirm card (Promises loop phase 1) is seeded from the briefing's
// next_actions — engine SUGGESTIONS. This mapper shapes them into editable drafts;
// only what the manager locks in gets stored (no-inference ruling).

test("maps briefing next_actions into manager-owned drafts, trimmed", () => {
  const drafts = draftsFromNextActions([
    { when: "this week", action: "  Book the onboarding buddy " },
    { when: "next 1:1", action: "Revisit the workload concern" },
  ]);
  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts[0], { owner: "manager", action: "Book the onboarding buddy", when: "this week" });
  assert.equal(drafts[1].owner, "manager"); // engine can't know owners — default manager, toggled by hand
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
});
