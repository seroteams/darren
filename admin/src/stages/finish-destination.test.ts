import { test } from "node:test";
import assert from "node:assert/strict";
import { finishDestination } from "./finish-destination.ts";
import { STAGES } from "../state.js";

// After a manager presses Finish, where do they land? The audit (X5) says: the person's own
// page when the run is tied to a roster person — that's where the saved briefing and the new
// top-placed "prep next" button both live. Old runs / free-text intakes carry no personId, so
// those fall back to Home. Pure decision, so we assert on the returned destination.

test("a run tied to a roster person lands on that person's page", () => {
  const d = finishDestination("p123");
  assert.equal(d.stage, STAGES.PERSON_DETAIL);
  assert.equal(d.personKey, "p123");
});

test("a run with no roster person falls back to Home", () => {
  const d = finishDestination(null);
  assert.equal(d.stage, STAGES.START);
  assert.equal(d.personKey, undefined);
});

test("an empty-string person id is treated as no person", () => {
  assert.equal(finishDestination("").stage, STAGES.START);
});
