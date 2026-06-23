#!/usr/bin/env node
// Rebuild questions/_index.json and optionally prune exact duplicate YAML files.
//
// Run: node scripts/rebuild-question-index.js [--prune]
//
// --prune  Delete exact duplicate questions (same name, description, purpose,
//          stage, axis_effects). Keeps the lexicographically first alias per group.

const fs = require("node:fs");
const path = require("node:path");
const { rebuildQuestionIndex, questionFingerprint, QUESTIONS_ROOT } = require("../backend/engine/questions");

function scanYamlQuestions(dir, subdir = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith("_") && e.name.endsWith(".json")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "_archive") continue;
      out.push(...scanYamlQuestions(full, subdir ? `${subdir}/${e.name}` : e.name));
    } else if (e.name.endsWith(".yaml")) {
      out.push({ alias: e.name.replace(/\.yaml$/, ""), subdir, path: full });
    }
  }
  return out;
}

function pruneExactDuplicates() {
  const { parseYaml } = require("../backend/engine/questions");
  const all = scanYamlQuestions(QUESTIONS_ROOT).map((item) => ({
    ...item,
    q: parseYaml(fs.readFileSync(item.path, "utf8")),
  }));

  const byFp = new Map();
  for (const item of all) {
    const f = questionFingerprint(item.q);
    if (!byFp.has(f)) byFp.set(f, []);
    byFp.get(f).push(item);
  }

  let removed = 0;
  for (const group of byFp.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.alias.localeCompare(b.alias));
    for (const dup of group.slice(1)) {
      fs.unlinkSync(dup.path);
      console.log(`  pruned duplicate: ${dup.alias} (kept ${group[0].alias})`);
      removed += 1;
    }
  }
  return removed;
}

function main() {
  const prune = process.argv.includes("--prune");
  if (prune) {
    console.log("\n  Pruning exact duplicates…");
    const n = pruneExactDuplicates();
    console.log(`  Removed ${n} file(s).\n`);
  }

  const index = rebuildQuestionIndex();
  console.log(`  Wrote questions/_index.json (${index.aliases.length} aliases)\n`);
}

main();
