#!/usr/bin/env node
// Replay the FULL 5-stage pipeline offline against a cassette — no API key, $0.
// (agent-native P1. The cassette seam lives in backend/engine/ai-client.ts.)
//
//   node scripts/replay-pipeline.js <run-dir>
//       Build a cassette + scenario from an existing run folder
//       (logs/<month>/<run-id>/ or a diagnostic bundle), replay it through the
//       real engine, then run the deterministic checks on the replayed session.
//
//   node scripts/replay-pipeline.js --scenario <path> --cassette <dir>
//       Replay a scenario file against an already-built cassette.
//
// Prints the replayed session dir, verdict + hard-fails, and the run cost
// (which must be $0.00). Exit 0 = replay ran and checks passed; 1 = checks
// failed; 2 = couldn't replay (bad inputs, missing raws — e.g. runs before
// ~Jul 01 lack per-turn planner raws).

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { runSmoke, ROOT } = require("./lib/run-scenario.js");
const { buildCassetteFromRun, synthesizeScenario, writeCassette } = require("./lib/cassette-from-run.js");
const { checkFromSessionDir } = require("./lib/check-session.ts");

function parseArgs(argv) {
  const out = { runDir: null, scenario: null, cassette: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--scenario") out.scenario = argv[++i];
    else if (argv[i] === "--cassette") out.cassette = argv[++i];
    else out.runDir = argv[i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let scenarioPath = args.scenario;
  let cassetteDir = args.cassette;

  if (args.runDir) {
    const runDir = path.isAbsolute(args.runDir) ? args.runDir : path.join(ROOT, args.runDir);
    if (!fs.existsSync(runDir)) {
      console.error(`run dir not found: ${runDir}`);
      process.exit(2);
    }
    const { entries } = buildCassetteFromRun(runDir);
    if (!entries.some((e) => e.label === "04-plan-turn")) {
      console.error(
        "this run has no per-turn planner raws (04-dynamic-answers/NN-response.json) — " +
          "runs recorded before ~Jul 01 can't replay the turn loop. Pick a newer run.",
      );
      process.exit(2);
    }
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "sero-replay-"));
    cassetteDir = work;
    writeCassette(work, entries);
    scenarioPath = path.join(work, "scenario.json");
    fs.writeFileSync(scenarioPath, `${JSON.stringify(synthesizeScenario(runDir), null, 2)}\n`);
    console.log(`cassette: ${entries.length} entries from ${path.relative(ROOT, runDir)}`);
  }

  if (!scenarioPath || !cassetteDir) {
    console.error("usage: node scripts/replay-pipeline.js <run-dir> | --scenario <path> --cassette <dir>");
    process.exit(2);
  }

  console.log("replaying pipeline offline (no API key needed)…");
  const result = await runSmoke(scenarioPath, { env: { SERO_CASSETTE_REPLAY: cassetteDir } });
  if (!result.sessionDir) {
    console.error(`replay produced no session dir (smoke exit ${result.code}). Last output:`);
    console.error(result.stdout.split("\n").slice(-25).join("\n"));
    process.exit(2);
  }

  const rel = path.relative(ROOT, result.sessionDir);
  console.log(`replayed session: ${rel} (smoke exit ${result.code}, ${Math.round(result.duration_ms / 1000)}s)`);

  // Honest cost check — replay must be $0.
  try {
    const cost = JSON.parse(fs.readFileSync(path.join(result.sessionDir, "cost.json"), "utf8"));
    console.log(`cost: $${Number(cost.usd_total || 0).toFixed(2)} across ${cost.call_count} calls`);
  } catch {
    console.log("cost: no cost.json written");
  }

  const { checks } = checkFromSessionDir(result.sessionDir);
  console.log(`verdict: ${checks.verdict}`);
  if (checks.hard_fails.length) console.log(`hard fails: ${checks.hard_fails.join(", ")}`);
  if (checks.warnings.length) console.log(`warnings: ${checks.warnings.join(", ")}`);

  process.exit(result.code === 0 && checks.verdict !== "fail" ? 0 : 1);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(2);
});
