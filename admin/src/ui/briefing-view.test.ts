import { test } from "node:test";
import assert from "node:assert/strict";
import { renderPromiseList, renderReadonlyBriefing } from "./briefing-view.ts";

// Promises loop phase 3 — the read-only promise list: manager's own first, each with
// its check-in outcome as a house .chip. Returns "" when the run armed no loop.
test("renderPromiseList puts the manager's own promises first", () => {
  const html = renderPromiseList([
    { id: "p1", owner: "report", action: "share the deck", outcome: "yes" },
    { id: "p2", owner: "manager", action: "revisit workload", outcome: "no" },
  ]);
  assert.ok(html.indexOf("revisit workload") < html.indexOf("share the deck"), "manager's promise renders above the report's");
});

test("renderPromiseList maps each outcome to its chip, and null reads as Open", () => {
  const html = renderPromiseList([
    { id: "a", owner: "manager", action: "a", outcome: "yes" },
    { id: "b", owner: "manager", action: "b", outcome: "partly" },
    { id: "c", owner: "manager", action: "c", outcome: "no" },
    { id: "d", owner: "manager", action: "d", outcome: "changed" },
    { id: "e", owner: "manager", action: "e", outcome: null },
  ]);
  assert.match(html, /chip--mint[^>]*>Done/);
  assert.match(html, /chip--gold[^>]*>Partly/);
  assert.match(html, /chip--coral[^>]*>Not done/);
  assert.match(html, /chip--plain chip--dot[^>]*>Changed/);
  assert.match(html, /chip--plain">Open/); // no status dot on an unchecked promise
});

test("renderPromiseList escapes the action text", () => {
  const html = renderPromiseList([{ id: "x", owner: "manager", action: "<script>alert(1)</script>", outcome: "yes" }]);
  assert.ok(!html.includes("<script>alert"), "the action is HTML-escaped");
  assert.match(html, /&lt;script&gt;/);
});

test("renderPromiseList returns empty when the loop armed nothing", () => {
  assert.equal(renderPromiseList(null), "");
  assert.equal(renderPromiseList([]), "");
  assert.equal(renderPromiseList([{ id: "x", owner: "manager", action: "", outcome: null }]), "", "a blank action is not a promise");
});

// The briefing view only grows a Promises card when promises are passed — old callers
// (guest runs, superadmin) that pass none are unchanged.
test("renderReadonlyBriefing adds a Promises card only when promises are present", () => {
  const b = { next_actions: [{ action: "do the thing" }] };
  assert.ok(!renderReadonlyBriefing(b, "Priya").includes("follow-through"), "no promises → no card");
  assert.ok(
    renderReadonlyBriefing(b, "Priya", [{ id: "p", owner: "manager", action: "revisit workload", outcome: "no" }]).includes("follow-through"),
    "promises → the card appears",
  );
});
