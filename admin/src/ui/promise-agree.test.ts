import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { draftsFromNextActions, MAX_PROMISES } from "./promise-agree.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, "promise-agree.ts"), "utf8");
const BRIEFING = fs.readFileSync(path.join(HERE, "..", "stages", "briefing.js"), "utf8");

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

test("caps at 10. Matches the server's ceiling", () => {
  const many = Array.from({ length: 14 }, (_, i) => ({ when: "today", action: `a${i}` }));
  assert.equal(draftsFromNextActions(many).length, 10);
  assert.equal(MAX_PROMISES, 10);
});

// action-review-placement P2 — the recap half. One button closes last time's and
// agrees this time's; the rows are the SAME component the walk-in offer uses, so
// the four words can never drift between the two places they appear.
test("the prior section reuses the check-in rows rather than a second copy of them", () => {
  assert.match(SRC, /import \{[^}]*renderCheckinRows[^}]*\} from "\.\/promise-checkin\.ts"/, "one row implementation");
  assert.ok(!/data-tap=/.test(SRC), "no hand-rolled tap markup in this module");
  assert.match(SRC, /priorTaps/, "taps live outside render(), which re-runs on every owner flip");
  assert.match(SRC, /onLock\(confirmed, tappedOutcomes\(prior, priorTaps\)\)/, "one press carries both");
});

test("the section only exists when the arc withheld the offer at the open", () => {
  assert.match(SRC, /prior\.length \?/, "no empty prior card ever renders");
  assert.match(
    BRIEFING,
    /offerActionsFor\(store\.ctx\?\.meetingType[\s\S]{0,120}\?\s*\[\]/,
    "an arc that DID offer them at the open shows nothing here"
  );
  assert.match(BRIEFING, /cachedPriorActions\(store\.sessionId\)/, "reads what this 1:1 saw at its start");
});

test("a failed write-back never costs the manager the promises they just agreed", () => {
  assert.match(
    BRIEFING,
    /if \(outcomes\.length\)[\s\S]{0,220}catch[\s\S]{0,120}console\.warn/,
    "the prior-run save is best-effort and caught on its own"
  );
});
