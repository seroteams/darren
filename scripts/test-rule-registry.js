#!/usr/bin/env node
// Prompt↔gate coupling registry test (agent-native P5).
//
// Prompt rules are mirrored by hardcoded gate constants/regexes; editing one
// side silently breaks the other, and until now only a PAID gate run caught it.
// This test walks content/prompts/rule-registry.ts and fails, naming the row,
// when any referenced prompt anchor, gate identifier, or golden case is gone —
// so a rename/edit on either side goes red in `npm test` for $0.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { RULE_REGISTRY } = require("../content/prompts/rule-registry.ts");

const ROOT = path.join(__dirname, "..");
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

check("registry has rows", () => {
  assert.ok(Array.isArray(RULE_REGISTRY) && RULE_REGISTRY.length >= 5, `expected >=5 rows, got ${RULE_REGISTRY?.length}`);
});

const goldenIds = JSON.parse(read("evals/golden/_index.json")).map((c) => c.id);

for (const row of RULE_REGISTRY || []) {
  check(`[${row.rule}] prompt side holds — "${row.promptAnchor}" in ${row.promptFile}`, () => {
    const src = read(path.join("content", "prompts", row.promptFile));
    assert.ok(
      src.includes(row.promptAnchor),
      `anchor text not found — the prompt rule moved or was reworded; update the rule AND its gate together, then this row`,
    );
  });

  check(`[${row.rule}] gate side holds — ${row.gateIdentifier} in ${row.gateFile}`, () => {
    const src = read(row.gateFile);
    assert.ok(
      new RegExp(`\\b${row.gateIdentifier}\\b`).test(src),
      `identifier not found — the gate constant/function was renamed or removed; this rule is now UNENFORCED`,
    );
  });

  check(`[${row.rule}] proven-by golden cases exist`, () => {
    for (const id of row.provenBy) {
      if (id === "*") continue; // every golden case exercises the full check suite
      assert.ok(goldenIds.includes(id), `golden case "${id}" not in evals/golden/_index.json`);
    }
  });
}

if (failures > 0) {
  console.error(`\n${failures} registry check(s) failed — a prompt rule and its gate have drifted apart.`);
  process.exit(1);
}
console.log("\nall rule-registry checks passed");
