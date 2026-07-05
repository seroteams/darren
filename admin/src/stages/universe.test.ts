// The Universe page (fun, admin-only) — tests for the pure graph builder that
// turns real app data (finished runs, meeting types) into the 3D node/edge map.
// Rendering is canvas eye-candy and stays untested; the data shaping lives here.
import test from "node:test";
import assert from "node:assert/strict";
import { buildUniverse, diffUniverse, summarizeDiff, describeNode, stars, PIPELINE } from "./universe.ts";
import type { UNode } from "./universe.ts";

test("buildUniverse: empty data still yields the core and the full pipeline chain", () => {
  const { nodes, edges } = buildUniverse({});
  const core = nodes.find((n) => n.kind === "core");
  assert.ok(core, "has a core node");
  const stages = nodes.filter((n) => n.kind === "stage");
  assert.equal(stages.length, PIPELINE.length);
  // Chain: core -> first stage, then each stage to the next.
  assert.ok(edges.some((e) => e.from === core!.id && e.to === `stage:${PIPELINE[0].key}`));
  for (let i = 0; i < PIPELINE.length - 1; i++) {
    assert.ok(
      edges.some((e) => e.from === `stage:${PIPELINE[i].key}` && e.to === `stage:${PIPELINE[i + 1].key}`),
      `chain link ${PIPELINE[i].key} -> ${PIPELINE[i + 1].key}`
    );
  }
});

test("buildUniverse: runs group under one person node per name, linked from Briefing", () => {
  const runs = [
    { id: "r1", headline: "Catch-up with Maya", ctx: { name: "Maya", role: "Designer", meetingType: "Weekly" } },
    { id: "r2", headline: "Maya again", ctx: { name: "maya " } },
    { id: "r3", ctx: { name: "Ola", role: "Engineer" } },
  ];
  const { nodes, edges } = buildUniverse({ runs });
  const people = nodes.filter((n) => n.kind === "person");
  assert.equal(people.length, 2, "two distinct people (Maya case/space-insensitive)");
  const runNodes = nodes.filter((n) => n.kind === "run");
  assert.equal(runNodes.length, 3);
  // Every run hangs off its person; every person receives a line from Briefing.
  const maya = people.find((p) => p.label === "Maya")!;
  assert.equal(edges.filter((e) => e.from === maya.id && e.to.startsWith("run:")).length, 2);
  for (const p of people) {
    assert.ok(edges.some((e) => e.from === "stage:briefing" && e.to === p.id), `briefing -> ${p.label}`);
  }
});

test("buildUniverse: meeting types become nodes; junk rows are skipped, labels fall back", () => {
  const { nodes } = buildUniverse({
    runs: [null, { id: "r9" }],
    types: [{ label: "Weekly 1:1" }, "Feels-off", null],
  });
  const types = nodes.filter((n) => n.kind === "type").map((n) => n.label);
  assert.deepEqual(types.sort(), ["Feels-off", "Weekly 1:1"]);
  const run = nodes.find((n) => n.kind === "run");
  assert.equal(run!.label, "r9", "no name/headline -> id is the label");
});

test("diffUniverse: identical maps report no change", () => {
  const a = buildUniverse({ runs: [{ id: "r1", ctx: { name: "Maya" } }], types: [{ label: "Weekly" }] });
  const b = buildUniverse({ runs: [{ id: "r1", ctx: { name: "Maya" } }], types: [{ label: "Weekly" }] });
  const diff = diffUniverse(a.nodes, b.nodes);
  assert.equal(diff.changed, false);
  assert.deepEqual(diff.addedIds, []);
});

test("diffUniverse: a new run + its new person are counted and their ids returned", () => {
  const before = buildUniverse({ runs: [{ id: "r1", ctx: { name: "Maya" } }] });
  const after = buildUniverse({
    runs: [{ id: "r1", ctx: { name: "Maya" } }, { id: "r2", ctx: { name: "Ola" } }],
  });
  const diff = diffUniverse(before.nodes, after.nodes);
  assert.equal(diff.changed, true);
  assert.equal(diff.added.run, 1, "one new run");
  assert.equal(diff.added.person, 1, "one new person");
  assert.ok(diff.addedIds.includes("run:r2"));
  assert.ok(diff.addedIds.includes("person:ola"));
});

test("diffUniverse: a dropped run is counted as removed, not added", () => {
  const before = buildUniverse({ runs: [{ id: "r1", ctx: { name: "Maya" } }, { id: "r2", ctx: { name: "Maya" } }] });
  const after = buildUniverse({ runs: [{ id: "r1", ctx: { name: "Maya" } }] });
  const diff = diffUniverse(before.nodes, after.nodes);
  assert.equal(diff.removed.run, 1);
  assert.deepEqual(diff.addedIds, []);
  assert.equal(diff.changed, true);
});

test("summarizeDiff: plain-language messages for the common cases", () => {
  assert.equal(summarizeDiff(diffUniverse([], [])), "Everything's already up to date.");

  const added = { added: { run: 2, person: 1 }, removed: {}, addedIds: ["run:a", "run:b", "person:x"], changed: true };
  assert.equal(summarizeDiff(added), "2 new 1:1s and 1 new person just appeared.");

  const removed = { added: {}, removed: { type: 1 }, addedIds: [], changed: true };
  assert.equal(summarizeDiff(removed), "1 meeting type dropped off.");

  const both = { added: { run: 1 }, removed: { person: 1 }, addedIds: ["run:a"], changed: true };
  assert.equal(summarizeDiff(both), "1 new 1:1 just appeared, and 1 person dropped off.");
});

test("stars: n filled then hollow, out of five", () => {
  assert.equal(stars(5), "★★★★★");
  assert.equal(stars(4), "★★★★☆");
  assert.equal(stars(1), "★☆☆☆☆");
});

const at = (ts: number | null | undefined) => (ts ? `t${ts}` : ""); // deterministic stub for fmtWhen

test("describeNode: a run shows who/role/meeting/when/rating and enables Open", () => {
  const run: UNode = {
    id: "run:r1", kind: "run", label: "Catch-up", sub: "Designer · Weekly", x: 0, y: 0, z: 0, r: 7,
    runId: "r1", withName: "Maya", role: "Designer", meetingType: "Weekly", lastSeenAt: 99, rating: 4,
  };
  const m = describeNode(run, at);
  assert.equal(m.eyebrow, "Finished 1:1");
  assert.deepEqual(m.rows, [
    { k: "With", v: "Maya" },
    { k: "Role", v: "Designer" },
    { k: "Meeting", v: "Weekly" },
    { k: "Last touched", v: "t99" },
    { k: "Rating", v: "★★★★☆", stars: true },
  ]);
  assert.equal(m.openRunId, "r1");
  assert.equal(m.runs, undefined);
});

test("describeNode: a person shows counts + roles and a clickable list of their 1:1s", () => {
  const person: UNode = {
    id: "person:maya", kind: "person", label: "Maya", sub: "2 finished 1:1s", x: 0, y: 0, z: 0, r: 15,
    runs: [
      { id: "r1", label: "One", role: "Designer", meetingType: "Weekly", lastSeenAt: 5, rating: null },
      { id: "r2", label: "Two", role: "Lead", meetingType: "", lastSeenAt: null, rating: null },
    ],
  };
  const m = describeNode(person, at);
  assert.deepEqual(m.rows, [
    { k: "Finished 1:1s", v: "2" },
    { k: "Roles", v: "Designer, Lead" },
  ]);
  assert.equal(m.runs?.length, 2);
  assert.equal(m.runs?.[0]?.sub, "Designer · Weekly · t5");
  assert.equal(m.runs?.[1]?.sub, "Lead"); // no meeting type or date -> just the role
  assert.equal(m.openRunId, undefined); // people don't get the Open button
});

test("describeNode: stage shows its step, core lists the pipeline, type names itself", () => {
  const stage = describeNode({ id: "stage:bank", kind: "stage", label: "Question bank", sub: "", x: 0, y: 0, z: 0, r: 20, step: 4 }, at);
  assert.deepEqual(stage.rows, [{ k: "Step", v: `4 of ${PIPELINE.length}` }]);

  const core = describeNode({ id: "core", kind: "core", label: "Sero", sub: "", x: 0, y: 0, z: 0, r: 46 }, at);
  assert.equal(core.steps?.length, PIPELINE.length);
  assert.equal(core.steps?.[0]?.label, "Intake");

  const type = describeNode({ id: "type:weekly", kind: "type", label: "Weekly", sub: "", x: 0, y: 0, z: 0, r: 10 }, at);
  assert.deepEqual(type.rows, [{ k: "Kind", v: "A meeting type Sero can run" }]);
});
