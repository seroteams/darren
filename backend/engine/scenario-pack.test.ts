import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScenarioPack, formatScenarioPack } from "./scenario-pack.ts";

// --- parseScenarioPack (model JSON is unknown until checked) ----------------

const valid = {
  projects: ["Checkout redesign", "Design-system audit"],
  coworkers: ["Priya (eng lead)", "Tom (PM)"],
  incident: "Handoff on the checkout redesign slipped twice — specs missing edge states.",
  goingWell: "The design-system audit is ahead of schedule and devs like the tokens page.",
};

test("parseScenarioPack accepts a valid pack", () => {
  assert.deepEqual(parseScenarioPack(valid), valid);
});

test("parseScenarioPack trims string fields", () => {
  const padded = {
    ...valid,
    projects: ["  Checkout redesign  ", "Design-system audit"],
    incident: `  ${valid.incident}  `,
  };
  assert.deepEqual(parseScenarioPack(padded), valid);
});

test("parseScenarioPack keeps only the first two projects and coworkers", () => {
  const extra = {
    ...valid,
    projects: [...valid.projects, "A third project"],
    coworkers: [...valid.coworkers, "Someone else"],
  };
  assert.deepEqual(parseScenarioPack(extra), valid);
});

test("parseScenarioPack rejects a non-object", () => {
  assert.equal(parseScenarioPack(null), null);
  assert.equal(parseScenarioPack("nope"), null);
});

test("parseScenarioPack rejects fewer than two projects", () => {
  assert.equal(parseScenarioPack({ ...valid, projects: ["Only one"] }), null);
});

test("parseScenarioPack rejects non-string coworkers", () => {
  assert.equal(parseScenarioPack({ ...valid, coworkers: [1, 2] }), null);
});

test("parseScenarioPack rejects a blank incident", () => {
  assert.equal(parseScenarioPack({ ...valid, incident: "   " }), null);
});

test("parseScenarioPack rejects a missing goingWell", () => {
  const { goingWell: _goingWell, ...rest } = valid;
  assert.equal(parseScenarioPack(rest), null);
});

// --- formatScenarioPack (the prompt block the suggester embeds) -------------

test("formatScenarioPack names every pack detail", () => {
  const block = formatScenarioPack(valid);
  for (const s of [
    "Checkout redesign",
    "Design-system audit",
    "Priya (eng lead)",
    "Tom (PM)",
    valid.incident,
    valid.goingWell,
  ]) {
    assert.ok(block.includes(s), `block should mention: ${s}`);
  }
});
