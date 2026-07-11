// The Universe page (fun, admin-only) — tests for the pure graph builder that
// turns real app data (finished runs, meeting types) into the 3D node/edge map.
// Rendering is canvas eye-candy and stays untested; the data shaping lives here.
import test from "node:test";
import assert from "node:assert/strict";
import { buildUniverse, diffUniverse, summarizeDiff, describeNode, stars, filterUniverse, focusUniverse, searchUniverse, PIPELINE, derivePipeline, ringChanges, recencyIntensity, RECENCY_HALF_LIFE_MS, sessionStalledMinutes, SESSION_STUCK_AFTER_MS, reviewWords, HEALTH_COLOR, fmtUsd } from "./universe.model.ts";
import type { UNode } from "./universe.model.ts";
import { TOPBAR_STAGES } from "../ui/stage-labels.js";

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

test("filterUniverse: hiding a kind removes its nodes and every line touching them", () => {
  const { nodes, edges } = buildUniverse({
    runs: [{ id: "r1", ctx: { name: "Maya" } }],
    types: [{ label: "Weekly" }],
  });
  const view = filterUniverse(nodes, edges, new Set(["person"]));
  assert.ok(!view.nodes.some((n) => n.kind === "person"), "people gone");
  assert.ok(view.nodes.some((n) => n.kind === "run"), "their runs stay");
  assert.ok(!view.edges.some((e) => e.from.startsWith("person:") || e.to.startsWith("person:")), "no dangling lines");
  assert.ok(view.edges.some((e) => e.from === "core"), "unrelated lines stay");
});

test("filterUniverse: the core can never be hidden; empty filter hides nothing", () => {
  const { nodes, edges } = buildUniverse({});
  const all = filterUniverse(nodes, edges, new Set());
  assert.equal(all.nodes.length, nodes.length);
  assert.equal(all.edges.length, edges.length);
  const noCore = filterUniverse(nodes, edges, new Set(["core", "stage"]));
  assert.ok(noCore.nodes.some((n) => n.kind === "core"), "the sun stays lit");
  assert.ok(!noCore.nodes.some((n) => n.kind === "stage"), "pipeline hidden as asked");
});

// A little world for focus/search tests: two people, their runs, a type, a lexicon.
const WORLD = buildUniverse({
  runs: [
    { id: "r1", headline: "Maya catch-up", ctx: { name: "Maya", role: "Designer", meetingType: "Weekly" } },
    { id: "r2", ctx: { name: "Maya", role: "Designer" } },
    { id: "r3", ctx: { name: "Ola", role: "Engineer", meetingType: "Weekly" } },
  ],
  types: [{ label: "Weekly" }],
  lexicons: [{ key: "designer", label: "Designer", terms: [] }],
  sessions: [{ id: "s1", stage: "BANK", ctx: { name: "Priya" } }],
});

test("focusUniverse: a person keeps their runs, their role words, their types — and drops the rest", () => {
  const f = focusUniverse(WORLD.nodes, WORLD.edges, "person:maya")!;
  const ids = new Set(f.nodes.map((n) => n.id));
  assert.ok(ids.has("person:maya") && ids.has("run:r1") && ids.has("run:r2"), "her and her runs");
  assert.ok(ids.has("lexicon:designer"), "her role words");
  assert.ok(ids.has("type:weekly"), "the type her runs used");
  assert.ok(ids.has("core"), "the core always stays");
  assert.ok(!ids.has("person:ola") && !ids.has("run:r3"), "other people gone");
  assert.ok(!ids.has("session:s1"), "unrelated live sessions gone");
  assert.ok(f.edges.every((e) => ids.has(e.from) && ids.has(e.to)), "no dangling lines");
});

test("focusUniverse: a run keeps its person + type; a type keeps its runs + their people", () => {
  const run = focusUniverse(WORLD.nodes, WORLD.edges, "run:r1")!;
  const runIds = new Set(run.nodes.map((n) => n.id));
  assert.ok(runIds.has("person:maya") && runIds.has("type:weekly"));
  assert.ok(!runIds.has("run:r2"), "her other run is not part of this run's story");

  const type = focusUniverse(WORLD.nodes, WORLD.edges, "type:weekly")!;
  const typeIds = new Set(type.nodes.map((n) => n.id));
  assert.ok(typeIds.has("run:r1") && typeIds.has("run:r3"), "both runs that used it");
  assert.ok(typeIds.has("person:maya") && typeIds.has("person:ola"), "and their people");
});

test("focusUniverse: a stage keeps its parts and parked sessions; core/unknown mean no focus", () => {
  const f = focusUniverse(WORLD.nodes, WORLD.edges, "stage:bank")!;
  const ids = new Set(f.nodes.map((n) => n.id));
  assert.ok(ids.has("session:s1"), "the session parked at Questions");
  assert.ok([...ids].some((id) => id.startsWith("part:bank:")), "its machinery");
  assert.ok(!ids.has("person:maya"));
  assert.equal(focusUniverse(WORLD.nodes, WORLD.edges, "core"), null, "core = the whole universe already");
  assert.equal(focusUniverse(WORLD.nodes, WORLD.edges, "nope"), null);
});

test("searchUniverse: case-insensitive, starts-with beats contains, short queries return nothing", () => {
  const hits = searchUniverse(WORLD.nodes, "may");
  assert.ok(hits.length >= 2);
  assert.equal(hits[0]!.id, "person:maya", "the person named Maya outranks runs that mention her");
  assert.deepEqual(searchUniverse(WORLD.nodes, "m"), [], "one letter is too little");
  assert.equal(searchUniverse(WORLD.nodes, "WEEKLY")[0]!.id, "type:weekly");
  assert.ok(searchUniverse(WORLD.nodes, "zzz").length === 0);
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

test("buildUniverse: live sessions become comets parked at their actual stage", () => {
  const { nodes, edges } = buildUniverse({
    sessions: [
      { id: "s1", stage: "QUESTIONING", ctx: { name: "Maya" }, lastSeenAt: 5 },
      { id: "s2", stage: "BRIEFING", ctx: { name: "Ola" } },   // finished -> not a comet
      { id: "s3", stage: "SOMETHING_NEW", ctx: {} },            // unknown stage -> parks at the core
    ],
  });
  const comets = nodes.filter((n) => n.kind === "session");
  assert.equal(comets.length, 2, "finished sessions don't get comets");
  const s1 = nodes.find((n) => n.id === "session:s1")!;
  assert.equal(s1.label, "Maya");
  assert.equal(s1.sessionStage, "Live Q&A", "stage shown in the app's own words");
  assert.ok(edges.some((e) => e.from === "stage:interview" && e.to === "session:s1"));
  assert.ok(edges.some((e) => e.from === "core" && e.to === "session:s3"));
});

test("buildUniverse: meeting types feed Intake and link to the runs that used them", () => {
  const { edges } = buildUniverse({
    types: [{ label: "Weekly" }],
    runs: [{ id: "r1", ctx: { name: "Maya", meetingType: "Weekly" } }],
  });
  assert.ok(edges.some((e) => e.from === "type:weekly" && e.to === "stage:intake"), "type flows INTO intake");
  assert.ok(!edges.some((e) => e.from === "core" && e.to === "type:weekly"), "no fictional core->type flow");
  assert.ok(edges.some((e) => e.from === "type:weekly" && e.to === "run:r1"), "run linked to the type it used");
});

test("buildUniverse: arcs + details enrich their meeting type's panel", () => {
  const { nodes } = buildUniverse({
    types: [{ label: "Weekly", duration: "15 min", description: "Steady catch-ups." }],
    arcs: [{ slug: "weekly", label: "Weekly", arc: [{}, {}, {}], tone_register: "Warm, direct" }],
  });
  const t = nodes.find((n) => n.id === "type:weekly")!;
  assert.equal(t.sub, "Steady catch-ups.", "the type's real description becomes its subtitle");
  assert.equal(t.arcSteps, 3);
  assert.equal(t.arcTone, "Warm, direct");
  const m = describeNode(t, () => "");
  assert.deepEqual(m.rows, [
    { k: "Duration", v: "15 min" },
    { k: "Arc steps", v: "3" },
    { k: "Tone", v: "Warm, direct" },
  ]);
});

test("buildUniverse: role word lists join the map and link to matching people", () => {
  const { nodes, edges } = buildUniverse({
    lexicons: [{ key: "pm", label: "Product Manager", terms: [{ term: "roadmap" }, { term: "scope" }] }],
    runs: [{ id: "r1", ctx: { name: "Maya", role: "Product  manager" } }], // sloppy spacing/case still matches
  });
  const lx = nodes.find((n) => n.kind === "lexicon")!;
  assert.equal(lx.label, "Product Manager");
  assert.ok(edges.some((e) => e.from === lx.id && e.to === "stage:prepare"), "role words feed Preparation");
  assert.ok(edges.some((e) => e.from === lx.id && e.to === "person:maya"), "linked to the person with that role");
  const m = describeNode(lx, () => "");
  assert.deepEqual(m.rows, [
    { k: "Words", v: "2" },
    { k: "Sample", v: "roadmap, scope" },
    { k: "Linked people", v: "Maya" }, // Phase 1b: the panel names who it's linked to
  ]);
});

test("buildUniverse: a label-less role word list gets a readable name, not its raw key", () => {
  const { nodes } = buildUniverse({ lexicons: [{ key: "backend-engineer--mid-level", terms: [] }] });
  const lx = nodes.find((n) => n.kind === "lexicon")!;
  assert.equal(lx.label, "Backend engineer · Mid level");
});

test("buildUniverse: the engine's real inner parts orbit their stage planets", () => {
  const { nodes, edges } = buildUniverse({});
  const parts = nodes.filter((n) => n.kind === "part");
  const around = (stageId: string) => parts.filter((p) => edges.some((e) => e.from === stageId && e.to === p.id));
  assert.equal(around("stage:bank").length, 5, "question bank: generator, validator, eligibility, dedup, queue");
  assert.equal(around("stage:evaluate").length, 3, "evaluate: axes, coverage, gates");
  assert.equal(around("stage:briefing").length, 3, "briefing: opener, agenda, closer");
  const dedup = parts.find((p) => p.label === "Dedup gate")!;
  const m = describeNode(dedup, () => "");
  assert.deepEqual(m.rows, [{ k: "Part of", v: "Question bank" }]);
});

test("diff + summary: live sessions are counted in plain words", () => {
  const before = buildUniverse({});
  const after = buildUniverse({ sessions: [{ id: "s1", stage: "EVAL", ctx: { name: "Maya" } }] });
  const diff = diffUniverse(before.nodes, after.nodes);
  assert.equal(diff.added.session, 1);
  assert.equal(summarizeDiff(diff), "1 new live session just appeared.");
});

test("describeNode: a live session shows who, where it is, and when it was touched", () => {
  const { nodes } = buildUniverse({ sessions: [{ id: "s1", stage: "PREPARATION", ctx: { name: "Ola" }, lastSeenAt: 7 }] });
  const m = describeNode(nodes.find((n) => n.id === "session:s1")!, (ts) => (ts ? `t${ts}` : ""));
  assert.equal(m.eyebrow, "Live session");
  assert.deepEqual(m.rows, [
    { k: "With", v: "Ola" },
    { k: "At stage", v: "Prep brief" },
    { k: "Last touched", v: "t7" },
  ]);
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

// ---- Phase 2 (page-heartbeat): the ring derives from the app's real flow ----

test("derivePipeline: the ring IS the topbar flow — same stages, same order, friendly labels kept", () => {
  const ring = derivePipeline(TOPBAR_STAGES);
  assert.deepEqual(
    ring.map((s) => ({ key: s.key, label: s.label })),
    [
      { key: "intake", label: "Intake" },
      { key: "focus", label: "Focus points" },
      { key: "prepare", label: "Preparation" },
      { key: "bank", label: "Question bank" },
      { key: "interview", label: "Interview" },
      { key: "evaluate", label: "Evaluate" },
      { key: "briefing", label: "Briefing" },
    ]
  );
  for (const s of ring) assert.ok(s.sub.length > 0, `${s.key} keeps its one-line sub`);
  // PIPELINE itself is the derived ring — no private copy left.
  assert.deepEqual(PIPELINE, ring);
});

test("derivePipeline: a stage the app grows appears on the ring honestly, not silently dropped", () => {
  const grown = [...TOPBAR_STAGES, ["SHADOW_REVIEW", "Shadow review", "Shadow"]];
  const ring = derivePipeline(grown);
  assert.equal(ring.length, TOPBAR_STAGES.length + 1);
  const extra = ring[ring.length - 1]!;
  assert.equal(extra.key, "shadow_review");
  assert.equal(extra.label, "Shadow review", "unknown stage falls back to its topbar label");
  assert.ok(extra.sub.length > 0, "unknown stage still gets an honest sub");
});

test("summarizeDiff: a pipeline step change is announced, never muted", () => {
  const base = buildUniverse({}).nodes;
  const extraStage: UNode = { id: "stage:shadow", kind: "stage", label: "Shadow review", sub: "", x: 0, y: 0, z: 0, r: 20 };
  const added = summarizeDiff(diffUniverse(base, [...base, extraStage]));
  assert.match(added, /1 new pipeline step/, `added stage must be called out, got: "${added}"`);
  const removed = summarizeDiff(diffUniverse([...base, extraStage], base));
  assert.match(removed, /1 pipeline step/, `removed stage must be called out, got: "${removed}"`);
});

test("ringChanges: plain words for added / removed / renamed, silence when nothing moved", () => {
  const prev = [{ key: "a", label: "Alpha" }, { key: "b", label: "Beta" }];
  assert.equal(ringChanges(prev, prev), "", "same ring -> no announcement");
  assert.equal(ringChanges(null, prev), "", "first visit (no snapshot) -> no announcement");
  assert.match(ringChanges(prev, [...prev, { key: "c", label: "Gamma" }]), /added: Gamma/);
  assert.match(ringChanges(prev, [prev[0]!]), /removed: Beta/);
  assert.match(ringChanges(prev, [prev[0]!, { key: "b", label: "Bravo" }]), /renamed: Beta → Bravo/);
});

// ---- Phase 1 (universe-monitoring): return-visit glow ----

test("recencyIntensity: 1 just now, halves each week, 0 when there's no timestamp", () => {
  const now = 1_800_000_000_000;
  assert.equal(recencyIntensity(now, now), 1, "a 1:1 finished this instant burns full");
  const half = recencyIntensity(now - RECENCY_HALF_LIFE_MS, now);
  assert.ok(half > 0.49 && half < 0.51, `one week old ≈ 0.5, got ${half}`);
  assert.ok(recencyIntensity(now - 4 * RECENCY_HALF_LIFE_MS, now) < 0.07, "a month dormant is nearly out");
  assert.equal(recencyIntensity(null, now), 0);
  assert.equal(recencyIntensity(undefined, now), 0);
  assert.equal(recencyIntensity(0, now), 0, "epoch zero means no timestamp, not 1970");
  assert.equal(recencyIntensity(now + 60_000, now), 1, "a clock-skewed future stamp clamps to full");
});

test("buildUniverse: a person's lastActiveAt is their newest 1:1, null when no run has a time", () => {
  const { nodes } = buildUniverse({
    runs: [
      { id: "r1", ctx: { name: "Maya" }, lastSeenAt: 100 },
      { id: "r2", ctx: { name: "Maya" }, lastSeenAt: 900 },
      { id: "r3", ctx: { name: "Maya" } },
      { id: "r4", ctx: { name: "Ola" } },
    ],
  });
  const maya = nodes.find((n) => n.id === "person:maya")!;
  assert.equal(maya.lastActiveAt, 900, "newest run wins");
  const ola = nodes.find((n) => n.id === "person:ola")!;
  assert.equal(ola.lastActiveAt, null, "no timestamps -> honestly unknown, not 0");
});

// ---- Phase 2 (universe-monitoring): health signals ----

test("sessionStalledMinutes: half an hour untouched is stalled; fresher or unknown is not", () => {
  const now = 1_800_000_000_000;
  assert.equal(sessionStalledMinutes(now - 31 * 60_000, now), 31, "31 minutes untouched -> stalled, says how long");
  assert.equal(sessionStalledMinutes(now - SESSION_STUCK_AFTER_MS, now), 30, "exactly at the line counts");
  assert.equal(sessionStalledMinutes(now - 29 * 60_000, now), null, "29 minutes is still fine");
  assert.equal(sessionStalledMinutes(null, now), null, "no timestamp -> we don't cry wolf");
  assert.equal(sessionStalledMinutes(0, now), null);
});

test("describeNode: a stalled session gets a plain-words Health row; a fresh one stays quiet", () => {
  const now = 1_800_000_000_000;
  const { nodes } = buildUniverse({
    sessions: [{ id: "s1", stage: "PREPARATION", ctx: { name: "Ola" }, lastSeenAt: now - 45 * 60_000 }],
  });
  const m = describeNode(nodes.find((n) => n.id === "session:s1")!, at, now);
  assert.ok(m.rows.some((r) => r.k === "Health" && r.v === "Stalled — nothing has happened for 45 minutes"));
  const fresh = describeNode(
    { ...nodes.find((n) => n.id === "session:s1")!, lastSeenAt: now - 60_000 },
    at,
    now
  );
  assert.ok(!fresh.rows.some((r) => r.k === "Health"), "touched a minute ago -> no Health row");
  // Long stalls switch to hours so nobody reads "540 minutes".
  const hours = describeNode(
    { ...nodes.find((n) => n.id === "session:s1")!, lastSeenAt: now - 9 * 60 * 60_000 },
    at,
    now
  );
  assert.ok(hours.rows.some((r) => r.k === "Health" && r.v === "Stalled — nothing has happened for about 9 hours"));
});

test("reviewWords: the QA verdict in plain words, silent when nothing was reviewed", () => {
  assert.equal(reviewWords("complete", "keep", 0), "Looked good");
  assert.equal(reviewWords("complete", "fix", 2), "Needs fixes — 2 areas flagged");
  assert.equal(reviewWords("partial", "fix", 0), "Needs fixes");
  assert.equal(reviewWords("complete", "block", 1), "Blocked — 1 area flagged");
  assert.equal(reviewWords("partial", null, 0), "Partly reviewed");
  assert.equal(reviewWords("complete", null, 0), "Reviewed, no verdict yet");
  assert.equal(reviewWords("none", null, 0), null);
  assert.equal(reviewWords(undefined, undefined, undefined), null);
});

test("buildUniverse + describeNode: a run carries its QA verdict and star rating from the feed", () => {
  const { nodes } = buildUniverse({
    runs: [{ id: "r1", ctx: { name: "Maya" }, rating: 4, reviewStatus: "complete", overall: "fix", failedCount: 2 }],
  });
  const run = nodes.find((n) => n.id === "run:r1")!;
  assert.equal(run.rating, 4, "the feed's bare stars number lands on the node");
  assert.equal(run.reviewOverall, "fix");
  const m = describeNode(run, at);
  assert.ok(m.rows.some((r) => r.k === "Rating" && r.v === "★★★★☆"), "the once-dead rating row comes alive");
  assert.ok(m.rows.some((r) => r.k === "QA check" && r.v === "Needs fixes — 2 areas flagged"));
  const plain = buildUniverse({ runs: [{ id: "r2", ctx: { name: "Ola" } }] });
  const quiet = describeNode(plain.nodes.find((n) => n.id === "run:r2")!, at);
  assert.ok(!quiet.rows.some((r) => r.k === "QA check"), "unreviewed -> no row");
  assert.ok(!quiet.rows.some((r) => r.k === "Rating"), "unrated -> no row");
});

// ---- Phase 3 (universe-monitoring): cost per run ----

test("fmtUsd: dollars read like money — cents at 2 decimals, sub-cent keeps a real digit", () => {
  assert.equal(fmtUsd(1.2), "$1.20");
  assert.equal(fmtUsd(0.0421), "$0.04");
  assert.equal(fmtUsd(0.38), "$0.38");
  assert.equal(fmtUsd(0.004), "$0.004", "a tiny dev run must not read as free");
  assert.equal(fmtUsd(0), "$0.00", "a recorded zero (offline replay) is honest");
});

test("buildUniverse: runs carry their cost; a person totals their runs' costs", () => {
  const { nodes } = buildUniverse({
    runs: [
      { id: "r1", ctx: { name: "Maya" }, cost: { usd: 0.38, calls: 9 } },
      { id: "r2", ctx: { name: "Maya" }, cost: { usd: 0.15, calls: 4 } },
      { id: "r3", ctx: { name: "Maya" } }, // pre-tracking run — no cost
      { id: "r4", ctx: { name: "Ola" } },
    ],
  });
  const r1 = nodes.find((n) => n.id === "run:r1")!;
  assert.equal(r1.costUsd, 0.38);
  assert.equal(r1.costCalls, 9);
  // A pre-tracking run (no cost object at all) must resolve to null, never throw
  // reading .usd off a null cost — the crash the /universe error log showed.
  const r3 = nodes.find((n) => n.id === "run:r3")!;
  assert.equal(r3.costUsd, null);
  assert.equal(r3.costCalls, null);
  const maya = nodes.find((n) => n.id === "person:maya")!;
  assert.ok(Math.abs((maya.totalCostUsd ?? 0) - 0.53) < 1e-9, "sums only the runs that have a cost");
  const ola = nodes.find((n) => n.id === "person:ola")!;
  assert.equal(ola.totalCostUsd, null, "no priced runs -> no total, not $0.00");
});

test("describeNode: cost rows — run says what it cost (and how many calls), person totals up", () => {
  const { nodes } = buildUniverse({
    runs: [
      { id: "r1", ctx: { name: "Maya" }, cost: { usd: 0.38, calls: 9 } },
      { id: "r2", ctx: { name: "Maya" }, cost: { usd: 0.15, calls: null } },
    ],
  });
  const withCalls = describeNode(nodes.find((n) => n.id === "run:r1")!, at);
  assert.ok(withCalls.rows.some((r) => r.k === "Cost to run" && r.v === "$0.38 (9 model calls)"));
  const noCalls = describeNode(nodes.find((n) => n.id === "run:r2")!, at);
  assert.ok(noCalls.rows.some((r) => r.k === "Cost to run" && r.v === "$0.15"));
  const person = describeNode(nodes.find((n) => n.id === "person:maya")!, at);
  assert.ok(person.rows.some((r) => r.k === "Total cost" && r.v === "$0.53"));
  const free = buildUniverse({ runs: [{ id: "r9", ctx: { name: "Ola" } }] });
  const quiet = describeNode(free.nodes.find((n) => n.id === "run:r9")!, at);
  assert.ok(!quiet.rows.some((r) => r.k === "Cost to run"), "pre-tracking run -> no row, no lie");
});

test("HEALTH_COLOR: warn and caution exist for the renderer's rings", () => {
  assert.ok(HEALTH_COLOR.warn.split(",").length === 3);
  assert.ok(HEALTH_COLOR.caution.split(",").length === 3);
});

// ---- Phase 1b (universe-monitoring): richer panels ----

test("describeNode: the core shows live numbers — people, finished 1:1s, live sessions", () => {
  const { nodes } = buildUniverse({
    runs: [{ id: "r1", ctx: { name: "Maya" } }, { id: "r2", ctx: { name: "Ola" } }],
    sessions: [{ id: "s1", stage: "BANK", ctx: { name: "Priya" } }],
  });
  const m = describeNode(nodes.find((n) => n.kind === "core")!, at);
  assert.deepEqual(m.rows, [
    { k: "People", v: "2" },
    { k: "Finished 1:1s", v: "2" },
    { k: "Live right now", v: "1" },
  ]);
  assert.equal(m.steps?.length, PIPELINE.length, "the pipeline list stays");
});

test("describeNode: a pipeline step names its machinery and counts sessions sitting there", () => {
  const { nodes } = buildUniverse({
    sessions: [
      { id: "s1", stage: "BANK", ctx: { name: "Priya" } },
      { id: "s2", stage: "BANK", ctx: { name: "Tom" } },
    ],
  });
  const bank = nodes.find((n) => n.id === "stage:bank")!;
  const m = describeNode(bank, at);
  assert.deepEqual(m.rows, [
    { k: "Step", v: `4 of ${PIPELINE.length}` },
    { k: "Machinery", v: "Question generator, Question validator, Eligibility filter, Dedup gate, Queue manager" },
    { k: "Live here now", v: "2 sessions" },
  ]);
  const quiet = describeNode(nodes.find((n) => n.id === "stage:intake")!, at);
  assert.ok(!quiet.rows.some((r) => r.k === "Live here now"), "no sessions -> no row");
  assert.ok(!quiet.rows.some((r) => r.k === "Machinery"), "no machinery -> no row");
});

test("describeNode: a meeting type says how many finished 1:1s used it", () => {
  const { nodes } = buildUniverse({
    types: [{ label: "Weekly" }, { label: "Feels-off" }],
    runs: [
      { id: "r1", ctx: { name: "Maya", meetingType: "Weekly" } },
      { id: "r2", ctx: { name: "Ola", meetingType: "Weekly" } },
    ],
  });
  const weekly = describeNode(nodes.find((n) => n.id === "type:weekly")!, at);
  assert.ok(weekly.rows.some((r) => r.k === "Used in" && r.v === "2 finished 1:1s"));
  const unused = describeNode(nodes.find((n) => n.id === "type:feels-off")!, at);
  assert.ok(!unused.rows.some((r) => r.k === "Used in"), "never used -> no row, no zero");
});

test("describeNode: a role word list names the people it's linked to", () => {
  const { nodes } = buildUniverse({
    lexicons: [{ key: "designer", label: "Designer", terms: [{ term: "grid" }] }],
    runs: [{ id: "r1", ctx: { name: "Maya", role: "Designer" } }],
  });
  const m = describeNode(nodes.find((n) => n.kind === "lexicon")!, at);
  assert.deepEqual(m.rows, [
    { k: "Words", v: "1" },
    { k: "Sample", v: "grid" },
    { k: "Linked people", v: "Maya" },
  ]);
});

test("describeNode: a person shows when their last 1:1 was; the row vanishes when unknown", () => {
  const person: UNode = {
    id: "person:maya", kind: "person", label: "Maya", sub: "1 finished 1:1", x: 0, y: 0, z: 0, r: 15,
    lastActiveAt: 900,
    runs: [{ id: "r1", label: "One", role: "Designer", meetingType: "", lastSeenAt: 900, rating: null }],
  };
  const m = describeNode(person, at);
  assert.deepEqual(m.rows, [
    { k: "Finished 1:1s", v: "1" },
    { k: "Last 1:1", v: "t900" },
    { k: "Role", v: "Designer" },
  ]);
  const unknown = describeNode({ ...person, lastActiveAt: null }, at);
  assert.ok(!unknown.rows.some((r) => r.k === "Last 1:1"), "no timestamp -> no row");
});
