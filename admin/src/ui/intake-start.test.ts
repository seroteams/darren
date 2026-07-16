import { test } from "node:test";
import assert from "node:assert/strict";
import { prepStartSubstage } from "./intake-start.ts";

// Pressing "Prep 1:1" on someone already on the Team roster shouldn't re-ask who they are — they
// were picked, so we already hold a personId + name. The flow should open at the meeting type.
// A brand-new free-text name still starts at the name step. (audit QA follow-up, folded into Ph1)

test("a known roster person skips straight to the meeting type", () => {
  assert.equal(prepStartSubstage({ personId: "p1", name: "Priya" }), "MEETING_TYPE");
});

test("a brand-new free-text name starts at the name step", () => {
  assert.equal(prepStartSubstage({ personId: null, name: "" }), "NAME");
  assert.equal(prepStartSubstage({ personId: null, name: "Someone New" }), "NAME");
});

test("a personId with no name is not treated as identified", () => {
  assert.equal(prepStartSubstage({ personId: "p1", name: "" }), "NAME");
});
