#!/usr/bin/env node
// Freeze a finished run folder into an offline regression fixture.
//
//   node scripts/replay-capture.js <run-dir> <case-id> [--kind happy|adversarial]
//
// Writes evals/replay/<case-id>/input.json   (the frozen inputs)
//    and evals/replay/<case-id>/expected.json (verdict + post-processed briefing
//                                              that CURRENT code produces).
// No API calls.

const fs = require("node:fs");
const path = require("node:path");
const { checkFromSessionDir } = require("./lib/check-session");

const ROOT = path.join(__dirname, "..");
const REPLAY_DIR = path.join(ROOT, "evals", "replay");

function parseArgs(argv) {
  const positional = [];
  let kind = "happy";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--kind") {
      kind = String(argv[i + 1] || "happy").trim();
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  return { runDir: positional[0], caseId: positional[1], kind };
}

function main() {
  const { runDir, caseId, kind } = parseArgs(process.argv.slice(2));
  if (!runDir || !caseId) {
    console.error("usage: node scripts/replay-capture.js <run-dir> <case-id> [--kind happy|adversarial]");
    process.exit(2);
  }
  const sessionDir = path.isAbsolute(runDir) ? runDir : path.join(ROOT, runDir);
  const { inputs, briefing, checks } = checkFromSessionDir(sessionDir);

  const caseDir = path.join(REPLAY_DIR, caseId);
  fs.mkdirSync(caseDir, { recursive: true });

  const input = {
    id: caseId,
    kind,
    captured_from: path.relative(ROOT, sessionDir).replace(/\\/g, "/"),
    ...inputs,
  };
  const expected = {
    verdict: checks.verdict,
    hard_fails: checks.hard_fails,
    warnings: checks.warnings,
    briefing,
  };

  fs.writeFileSync(path.join(caseDir, "input.json"), `${JSON.stringify(input, null, 2)}\n`);
  fs.writeFileSync(path.join(caseDir, "expected.json"), `${JSON.stringify(expected, null, 2)}\n`);

  const tail = checks.hard_fails.length ? ` [${checks.hard_fails.join(", ")}]` : "";
  console.log(`captured ${caseId} (${kind}) from ${input.captured_from} → ${checks.verdict}${tail}`);
}

main();
