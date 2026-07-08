#!/usr/bin/env node
// Reproduce a reported bug from a diagnostic bundle — offline, $0. (agent-native P1)
//
//   node scripts/repro-from-bundle.js <bundle-dir>
//
// A diagnostic bundle IS a run folder (logs/<month>/<run-id>/ layout). This:
//   1. runs the deterministic checks on the bundle as reported,
//   2. replays the bundle's model responses through the CURRENT engine
//      (scripts/replay-pipeline.js does the heavy lifting),
//   3. checks the replayed session and says whether the outcome REPRODUCES.
//
// Exit 0 = reproduced (same verdict + hard-fails — the bug is real on current
// code, go fix it). Exit 1 = did NOT reproduce (current code changes the
// outcome — diff below tells you how). Exit 2 = couldn't replay.

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { checkFromSessionDir } = require("./lib/check-session.ts");
const { ROOT } = require("./lib/run-scenario.js");

const bundleArg = process.argv[2];
if (!bundleArg) {
  console.error("usage: node scripts/repro-from-bundle.js <bundle-dir>");
  process.exit(2);
}
const bundleDir = path.isAbsolute(bundleArg) ? bundleArg : path.join(ROOT, bundleArg);

// 1. The bundle as reported, judged by current code.
const original = checkFromSessionDir(bundleDir).checks;
console.log(`bundle as reported → ${original.verdict}${original.hard_fails.length ? ` [${original.hard_fails.join(", ")}]` : ""}`);

// 2. Replay through the current engine.
const replay = spawnSync(process.execPath, ["scripts/replay-pipeline.js", bundleDir], {
  cwd: ROOT,
  encoding: "utf8",
});
const out = `${replay.stdout || ""}${replay.stderr || ""}`;
process.stdout.write(out);
const sessionMatch = out.match(/replayed session: (\S+)/);
if (!sessionMatch) {
  console.error("replay did not produce a session — cannot judge reproduction");
  process.exit(2);
}

// 3. Compare.
const replayed = checkFromSessionDir(path.join(ROOT, sessionMatch[1])).checks;
const sameVerdict = replayed.verdict === original.verdict;
const sameFails =
  JSON.stringify([...replayed.hard_fails].sort()) === JSON.stringify([...original.hard_fails].sort());

if (sameVerdict && sameFails) {
  console.log(`\nREPRODUCES: yes — replay gives ${replayed.verdict}${replayed.hard_fails.length ? ` [${replayed.hard_fails.join(", ")}]` : ""}, same as the bundle.`);
  process.exit(0);
}
console.log("\nREPRODUCES: no — current code changes the outcome:");
console.log(`  bundle:   ${original.verdict} [${original.hard_fails.join(", ") || "-"}]`);
console.log(`  replayed: ${replayed.verdict} [${replayed.hard_fails.join(", ") || "-"}]`);
process.exit(1);
