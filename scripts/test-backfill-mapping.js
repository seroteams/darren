#!/usr/bin/env node
// Phase 6 (postgres-runtime-data) — the importer's pure mapping rules, offline:
// prompts and raw model responses stay TEXT (a parse failure must surface, never
// be hidden), sidecars fold into sessions columns and never become artifacts.
// FREE: no database, no OpenAI. Importing the script must NOT run the import
// (guarded — the gate.js lesson).

const assert = require("node:assert");
const { kindFor, SIDECAR_FILES } = require("./backfill-runs.ts");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}: ${e.message}`); }
}

check("prompts are text", () => {
  assert.strictEqual(kindFor("prompt.md"), "text");
  assert.strictEqual(kindFor("03-prompt.md"), "text");
});

check("raw model responses stay text (parse failures must surface)", () => {
  assert.strictEqual(kindFor("response.json"), "text");
  assert.strictEqual(kindFor("07-response.json"), "text");
  assert.strictEqual(kindFor("final.json"), "text");
});

check("structured run files are json", () => {
  assert.strictEqual(kindFor("transcript.json"), "json");
  assert.strictEqual(kindFor("inputs.json"), "json");
  assert.strictEqual(kindFor("cost.json"), "json");
  assert.strictEqual(kindFor("pipeline-lock.json"), "json");
  assert.strictEqual(kindFor("01-turn.json"), "json");
});

check("jsonl and unknown extensions", () => {
  assert.strictEqual(kindFor("lexicon-decisions.jsonl"), "jsonl");
  assert.strictEqual(kindFor("notes.md"), "text");
  assert.strictEqual(kindFor("something.txt"), "text");
});

check("sidecars fold into columns, never artifacts", () => {
  for (const f of ["review.json", "rating.json", "archive.json", "session-state.json"]) {
    assert.ok(SIDECAR_FILES.has(f), f);
  }
  assert.ok(!SIDECAR_FILES.has("transcript.json"));
});

if (failed > 0) {
  console.error(`test-backfill-mapping: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("test-backfill-mapping: all checks passed");
