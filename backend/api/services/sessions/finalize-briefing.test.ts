import { test } from "node:test";
import assert from "node:assert/strict";
import { finalizeBriefing } from "./finalize-briefing.ts";
import type { Session } from "../../../shared/session.types.ts";
import type { Briefing } from "../../../shared/briefing.types.ts";

// Regression guard (live-test 2026-07-13): completing a 1:1 must PERSIST the
// session. The durable store derives `finished = Boolean(briefing)` at write time,
// and evaluation is the last stage — so without an explicit persist the finished
// flag never lands, and the completed run vanishes from the manager's finished
// list AND the member's about-me until some later incidental write re-persists it.
function fakeSession(): Session {
  return {
    id: "s1",
    dir: "/tmp/s1",
    completedAt: null,
    briefing: null,
    tracker: { summary: () => ({ usd_cost: 0 }) },
  } as unknown as Session;
}

test("finalizeBriefing stamps the briefing and persists so the run is marked finished", () => {
  const s = fakeSession();
  let persisted = 0;
  let reviewed = 0;
  finalizeBriefing(s, { headline: "walk in with X" } as unknown as Briefing, {
    persist: () => { persisted += 1; },
    kickReview: () => { reviewed += 1; },
  });

  assert.equal((s.briefing as unknown as { headline: string }).headline, "walk in with X", "briefing stamped");
  assert.equal(typeof s.completedAt, "number", "completedAt stamped");
  assert.equal(persisted, 1, "MUST persist on completion — else the finished flag never lands");
  assert.equal(reviewed, 1, "lexicon review still kicked");
});
