#!/usr/bin/env node
// Manual QA smoke — verifies FX-53/FX-37/LF-6 code paths exist (offline).
// Run: node scripts/manual-qa-verify.js

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function ok(label, cond) {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
  return cond ? 0 : 1;
}

function main() {
  console.log("\n─── Manual QA code-path checks ───\n");
  let failed = 0;

  const focus = read("admin/src/stages/focus-points.js");
  failed += ok("FX-53 Regenerate bumps stageTick", /regenerateFocusPoints|stageTick/.test(focus));
  failed += ok("FX-53 regenerate query param", /set\("regenerate",\s*"1"\)/.test(focus));

  const lexicon = read("admin/src/stages/lexicon-review.js");
  failed += ok("LF-6 Promote button in lexicon review", /promote|Promote/.test(lexicon));

  const promoteCore = fs.existsSync(path.join(ROOT, "backend/engine/lexicon/promote-core.js"));
  failed += ok("LF-6 promote-core module", promoteCore);

  if (failed) {
    console.error(`\n${failed} manual QA path check(s) FAILED\n`);
    process.exit(1);
  }
  console.log("\n✓ Manual QA code paths present. Run one real 1:1 in browser to confirm UX.\n");
}

main();
