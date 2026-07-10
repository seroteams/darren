import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createHeartbeatService,
  isScreenFile,
  headerLine,
  planTitle,
  countPhases,
  listPhases,
  currentState,
} from "./heartbeat.service.ts";
import type { HeartbeatRepo } from "./heartbeat.repo.ts";

// A fake repo returns canned reads — proving the service's shaping (filtering,
// comment extraction, narrowing) is independent of the filesystem.
function fakeRepo(over: Partial<HeartbeatRepo> = {}): HeartbeatRepo {
  return {
    stageFileNames: () => ["runs.ts", "guide.js"],
    stageFileHead: () => "// A page.\ncode();",
    scriptNames: () => ["dev", "test"],
    axesRaw: () => ({ axes: [{ id: "wellbeing", label: "Wellbeing" }] }),
    questionCountRaw: () => ({ count: 4234 }),
    todoSlugs: () => [],
    doneSlugs: () => [],
    planText: () => "",
    ...over,
  };
}

const PLAN_SAMPLE = [
  "# Page heartbeat — real UPDATE buttons",
  "",
  "## Phases",
  "| # | Phase | What it lands | Status |",
  "|---|---|---|---|",
  "| 1 | Heartbeat endpoint | the endpoint | ✅ |",
  "| 2 | Universe ring | the ring | 🔨 |",
  "| 3 | Tasks board | the check | ⬜ |",
  "",
  "⬜ not started · 🔨 in progress · ✅ done (tested)",
  "",
  "## Current state",
  "**Phase 1 ✅ — walked + green-lit by Carl.** Next: Phase 2.",
  "",
  "Extra paragraph that should be ignored.",
  "",
  "## Parked",
  "- something",
].join("\n");

const BUILD = () => ({ build: "abc1234", committedAt: "2026-07-05T00:00:00Z", bootedAt: "x" });

test("isScreenFile keeps real screens, drops tests/types/declarations", () => {
  assert.equal(isScreenFile("runs.ts"), true);
  assert.equal(isScreenFile("guide.js"), true);
  assert.equal(isScreenFile("error.ts"), true);
  assert.equal(isScreenFile("universe.test.ts"), false);
  assert.equal(isScreenFile("stage.types.ts"), false);
  assert.equal(isScreenFile("state.d.ts"), false);
  assert.equal(isScreenFile("notes.md"), false);
});

test("headerLine takes the first sentence of a leading // comment", () => {
  const head = [
    "// Operator guide (internal, for the founder). A single read-only reference",
    "// for the whole project: more words here.",
    "import x from 'y';",
  ].join("\n");
  assert.equal(headerLine(head), "Operator guide (internal, for the founder).");
});

test("headerLine joins wrapped comment lines to finish the sentence", () => {
  const head = "// Path-based routing for the SPA that maps\n// stage to pathname. Second sentence.\n";
  assert.equal(headerLine(head), "Path-based routing for the SPA that maps stage to pathname.");
});

test("headerLine is empty when the file starts with code", () => {
  assert.equal(headerLine('import { a } from "./b.ts";\n// later comment'), "");
});

test("headerLine caps a run-on first line", () => {
  const long = "// " + "word ".repeat(80);
  const out = headerLine(long);
  assert.ok(out.length <= 161);
  assert.ok(out.endsWith("…"));
});

test("snapshot composes screens (sorted, with descriptions), commands, axes, count, build", () => {
  const heads: Record<string, string> = {
    "guide.js": "// The guide page.\n",
    "runs.ts": "// Past 1:1s list.\n",
  };
  const svc = createHeartbeatService(
    fakeRepo({ stageFileHead: (f) => heads[f] ?? "" }),
    BUILD
  );
  const body = svc.snapshot();
  assert.deepEqual(body.screens, [
    { file: "guide.js", desc: "The guide page." },
    { file: "runs.ts", desc: "Past 1:1s list." },
  ]);
  assert.deepEqual(body.commands, ["dev", "test"]);
  assert.deepEqual(body.axes, [{ id: "wellbeing", label: "Wellbeing" }]);
  assert.equal(body.questionCount, 4234);
  assert.equal(body.build, "abc1234");
  assert.equal(body.committedAt, "2026-07-05T00:00:00Z");
});

test("snapshot filters non-screen files and survives junk reads", () => {
  const svc = createHeartbeatService(
    fakeRepo({
      stageFileNames: () => ["runs.ts", "runs.test.ts", "stage.types.ts"],
      axesRaw: () => "not json shape",
      questionCountRaw: () => ({ nope: true }),
    }),
    BUILD
  );
  const body = svc.snapshot();
  assert.deepEqual(body.screens.map((s) => s.file), ["runs.ts"]);
  assert.deepEqual(body.axes, []);
  assert.equal(body.questionCount, null);
});

test("snapshot drops malformed axis entries but keeps good ones", () => {
  const svc = createHeartbeatService(
    fakeRepo({
      axesRaw: () => ({ axes: [{ id: "growth", label: "Growth" }, { id: 7 }, "junk"] }),
    }),
    BUILD
  );
  assert.deepEqual(svc.snapshot().axes, [{ id: "growth", label: "Growth" }]);
});

test("planTitle takes the first heading, falls back to the slug", () => {
  assert.equal(planTitle(PLAN_SAMPLE, "page-heartbeat"), "Page heartbeat — real UPDATE buttons");
  assert.equal(planTitle("no heading here\n", "my-slug"), "my-slug");
});

test("countPhases tallies status rows and ignores the legend line", () => {
  assert.deepEqual(countPhases(PLAN_SAMPLE), { done: 1, inProgress: 1, total: 3 });
});

test("countPhases returns zeroes when there's no status table", () => {
  assert.deepEqual(countPhases("# Plan\n\nJust prose, no table.\n"), { done: 0, inProgress: 0, total: 0 });
});

test("listPhases returns the ordered phase rows with label and status", () => {
  assert.deepEqual(listPhases(PLAN_SAMPLE), [
    { label: "Heartbeat endpoint", status: "done" },
    { label: "Universe ring", status: "doing" },
    { label: "Tasks board", status: "todo" },
  ]);
});

test("listPhases is empty when there's no status table", () => {
  assert.deepEqual(listPhases("# Plan\n\nJust prose, no table.\n"), []);
});

test("listPhases strips markdown from labels and skips multi-glyph legend rows", () => {
  const text = [
    "| # | Phase | Status |",
    "|---|---|---|",
    "| 1 | **Bold [link](x.md)** phase | ⬜ |",
    "| legend | ⬜ not started · 🔨 in progress · ✅ done | — |",
  ].join("\n");
  assert.deepEqual(listPhases(text), [{ label: "Bold link phase", status: "todo" }]);
});

test("listPhases falls back to the first real cell when the table has no # column", () => {
  const text = "| Ship it | ✅ |\n";
  assert.deepEqual(listPhases(text), [{ label: "Ship it", status: "done" }]);
});

test("currentState returns the first paragraph under the heading, as plain text", () => {
  assert.equal(
    currentState(PLAN_SAMPLE),
    "Phase 1 ✅ — walked + green-lit by Carl. Next: Phase 2."
  );
  assert.equal(currentState("# Plan\n\nno current-state section\n"), "");
});

test("snapshot composes the todos view from the plan folders", () => {
  const svc = createHeartbeatService(
    fakeRepo({
      todoSlugs: () => ["page-heartbeat", "empty-plan"],
      doneSlugs: () => ["old-thing", "auth"],
      planText: (slug) => (slug === "page-heartbeat" ? PLAN_SAMPLE : ""),
    }),
    BUILD
  );
  const { todos } = svc.snapshot();
  assert.deepEqual(todos.done, ["auth", "old-thing"]);
  assert.equal(todos.active.length, 2);
  // active is sorted by slug, so "empty-plan" comes before "page-heartbeat".
  // A folder with no/unreadable PLAN.md degrades gracefully to the slug + zeroes.
  assert.deepEqual(todos.active[0], {
    slug: "empty-plan",
    title: "empty-plan",
    done: 0,
    inProgress: 0,
    total: 0,
    phases: [],
    state: "",
  });
  assert.deepEqual(todos.active[1], {
    slug: "page-heartbeat",
    title: "Page heartbeat — real UPDATE buttons",
    done: 1,
    inProgress: 1,
    total: 3,
    phases: [
      { label: "Heartbeat endpoint", status: "done" },
      { label: "Universe ring", status: "doing" },
      { label: "Tasks board", status: "todo" },
    ],
    state: "Phase 1 ✅ — walked + green-lit by Carl. Next: Phase 2.",
  });
});
