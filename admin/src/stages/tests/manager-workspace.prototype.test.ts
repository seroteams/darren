import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MANAGER_WORKSPACE_SCENES } from "./manager-workspace.prototype.ts";

test("manager workspace exposes five scenes in the intended order", () => {
  assert.deepEqual(
    MANAGER_WORKSPACE_SCENES.map((scene) => scene.id),
    ["today", "team", "person", "prepare", "followthrough"],
  );
});

test("every scene advances to a real, different scene", () => {
  const ids = new Set(MANAGER_WORKSPACE_SCENES.map((scene) => scene.id));
  for (const scene of MANAGER_WORKSPACE_SCENES) {
    assert.ok(ids.has(scene.primaryTarget), `${scene.id} targets unknown scene ${scene.primaryTarget}`);
    assert.notEqual(scene.primaryTarget, scene.id, `${scene.id} points at itself (dead end)`);
  }
});

test("the primary-action path from today visits all five scenes and loops home", () => {
  const byId = new Map(MANAGER_WORKSPACE_SCENES.map((scene) => [scene.id, scene]));
  const visited: string[] = [];
  let current = byId.get("today");
  for (let step = 0; step < MANAGER_WORKSPACE_SCENES.length; step += 1) {
    assert.ok(current, "primary path fell off the scene graph");
    visited.push(current.id);
    current = byId.get(current.primaryTarget);
  }
  assert.equal(new Set(visited).size, MANAGER_WORKSPACE_SCENES.length);
  assert.deepEqual([...visited].sort(), [...byId.keys()].sort());
  assert.equal(current?.id, "today"); // the walk returns to the start
});

test("prototype source cannot call or persist to product services", () => {
  const source = readFileSync(new URL("./manager-workspace.prototype.ts", import.meta.url), "utf8");
  for (const forbidden of ["fetch(", "localStorage", "sessionStorage", "document.cookie", "/api/"]) {
    assert.equal(source.includes(forbidden), false, `found forbidden product access: ${forbidden}`);
  }
});

test("feasibility overlay is wired: two independent tiers + flagged elements", () => {
  const source = readFileSync(new URL("./manager-workspace.prototype.ts", import.meta.url), "utf8");
  // Both tier toggles exist and drive their own root class.
  for (const wiring of [
    'data-gap-toggle="red"', 'data-gap-toggle="amber"',
    "mw--gap-red", "mw--gap-amber",
  ]) {
    assert.ok(source.includes(wiring), `missing overlay wiring: ${wiring}`);
  }
  // Elements are actually flagged in both tiers via the gap() helper (call sites,
  // not just the CSS selectors), each carrying a corner-tag note.
  assert.ok(/gap\("red", ".+"\)/.test(source), "no red-tier gap() flags on elements");
  assert.ok(/gap\("amber", ".+"\)/.test(source), "no amber-tier gap() flags on elements");
});
