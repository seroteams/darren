import { test } from "node:test";
import assert from "node:assert/strict";
import { createHeartbeatService, isScreenFile, headerLine } from "./heartbeat.service.ts";
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
    ...over,
  };
}

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
