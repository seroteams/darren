#!/usr/bin/env node
// Orchestrator parity guard (agent-native P4).
//
// The pipeline is wired TWICE — web (backend/api/services/sessions/session-streams.ts,
// SSE handlers, execution order driven by the client) and CLI
// (backend/cli.ts → backend/engine/cli/stages/*). Nothing but the paid gate caught
// a drift between them until this test. It asserts, offline:
//   1. STAGE_SEQUENCE is sane and anchored to reality — each stage's costLabel
//      really appears in its engine file, and its model stage exists in models.ts.
//   2. The CLI main flow calls the five stage drivers in exactly the declared
//      order (cli.ts is linear, so source order IS execution order there).
//   3. The web path invokes every stage's engine function (coverage — a dropped
//      or renamed stage fails; source order is NOT asserted because SSE handler
//      definition order is not execution order).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { STAGE_SEQUENCE } = require("../../engine/index.ts");
const { STAGES } = require("../../engine/models.ts");

const ROOT = path.join(__dirname, "..", "..", "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`PASS  ${label}`);
  } catch (e) {
    failures += 1;
    console.log(`FAIL  ${label} — ${e.message}`);
  }
}

check("STAGE_SEQUENCE declares the 5 pipeline stages, unique ids, known model stages", () => {
  assert.equal(STAGE_SEQUENCE.length, 5, `expected 5 stages, got ${STAGE_SEQUENCE.length}`);
  const ids = STAGE_SEQUENCE.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate stage ids: ${ids.join(", ")}`);
  for (const s of STAGE_SEQUENCE) {
    assert.ok(STAGES.includes(s.modelStage), `stage ${s.id}: modelStage "${s.modelStage}" not in models.ts STAGES`);
  }
});

check("each stage's costLabel is real — it appears in its engine file", () => {
  for (const s of STAGE_SEQUENCE) {
    const src = read(path.join("backend", "engine", s.engineFile));
    assert.ok(
      src.includes(`"${s.costLabel}"`),
      `stage ${s.id}: costLabel "${s.costLabel}" not found in backend/engine/${s.engineFile}`,
    );
  }
});

check("CLI path (backend/cli.ts) runs the stage drivers in the declared order", () => {
  const src = read("backend/cli.ts");
  // Look only at the flow body (skip the import block) so an import reorder
  // can't mask a call reorder.
  const body = src.slice(src.lastIndexOf("import "));
  let prev = -1;
  let prevName = "(start)";
  for (const s of STAGE_SEQUENCE) {
    const at = body.search(new RegExp(`(?<!function )\\b${s.cliFn}\\(`));
    assert.ok(at >= 0, `CLI never calls ${s.cliFn} (stage ${s.id})`);
    assert.ok(
      at > prev,
      `CLI order drift: ${s.cliFn} (stage ${s.id}) runs before ${prevName} — expected ${STAGE_SEQUENCE.map((x) => x.cliFn).join(" → ")}`,
    );
    prev = at;
    prevName = s.cliFn;
  }
});

check("web path (session-streams.ts) invokes every stage's engine function", () => {
  const src = read("backend/api/services/sessions/session-streams.ts");
  for (const s of STAGE_SEQUENCE) {
    assert.ok(
      new RegExp(`\\b${s.engineFn}\\(`).test(src),
      `web path never calls ${s.engineFn} (stage ${s.id}) — did a stage get dropped or renamed on one side only?`,
    );
  }
});

if (failures > 0) {
  console.error(`\n${failures} parity check(s) failed — the web and CLI pipelines have drifted (or STAGE_SEQUENCE is stale).`);
  process.exit(1);
}
console.log("\nall stage-parity checks passed");
