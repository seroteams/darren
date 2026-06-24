#!/usr/bin/env node
// Engine refinement loop — matrix runner (offline).
// Run: node scripts/eval.js
//      node scripts/eval.js --session logs/may/2026_May24_21-46-1eb839fd

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const { PROMPTS_DIR } = require("../backend/engine/paths.mts");
const { evaluateNotes, summarizeResults } = require("../backend/engine/rules.ts");
const { promptVersionFor } = require("../backend/engine/prompt-version.ts");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function runReplayBatch() {
  const res = spawnSync(process.execPath, ["scripts/batch-m4-verify.js"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return res.status === 0;
}

function evalPromptNotes() {
  const planTurnText = fs.readFileSync(path.join(PROMPTS_DIR, "plan-turn.md"), "utf8");
  const planResults = evaluateNotes("prompts/plan-turn.notes.yaml", {
    output: { _prompt_text: planTurnText },
  });
  const planSummary = summarizeResults(planResults);

  console.log("\n─── Prompt notes: plan-turn ───");
  for (const r of planResults) {
    console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.id}${r.reason ? ` — ${r.reason}` : ""}`);
  }
  console.log(`  prompt_version: ${promptVersionFor(path.join(PROMPTS_DIR, "plan-turn.md"))}`);

  return planSummary.ok ? 0 : 1;
}

function evalSessionBriefing(sessionDir) {
  const evalPath = path.join(sessionDir, "05-evaluation/response.json");
  if (!fs.existsSync(evalPath)) {
    console.error(`  SKIP  no evaluation response: ${evalPath}`);
    return 0;
  }
  let raw = fs.readFileSync(evalPath, "utf8");
  let briefing;
  try {
    briefing = JSON.parse(raw);
    if (briefing.raw) briefing = JSON.parse(briefing.raw);
  } catch {
    console.error(`  FAIL  could not parse briefing at ${evalPath}`);
    return 1;
  }

  const results = evaluateNotes("prompts/final-evaluation.notes.yaml", { output: briefing });
  const summary = summarizeResults(results);
  console.log(`\n─── Session briefing rules: ${path.relative(ROOT, sessionDir)} ───`);
  for (const r of results) {
    console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.id}${r.reason ? ` — ${r.reason}` : ""}`);
  }
  const prepInputs = path.join(sessionDir, "01b-preparation/inputs.json");
  if (fs.existsSync(prepInputs)) {
    const inp = loadJson(prepInputs);
    if (inp.prompt_version) console.log(`  prep prompt_version: ${inp.prompt_version}`);
  }
  const evalInputs = path.join(sessionDir, "05-evaluation/inputs.json");
  if (fs.existsSync(evalInputs)) {
    const inp = loadJson(evalInputs);
    if (inp.prompt_version) console.log(`  eval prompt_version: ${inp.prompt_version}`);
  }
  return summary.ok ? 0 : 1;
}

function main() {
  const sessionIdx = process.argv.indexOf("--session");
  const sessionArg = sessionIdx >= 0 ? process.argv[sessionIdx + 1] : null;

  console.log("\n─── eval matrix (engine refinement loop) ───\n");

  let failed = 0;
  failed += evalPromptNotes() ? 1 : 0;
  failed += runReplayBatch() ? 0 : 1;

  const defaultSession = path.join(ROOT, "logs/may/2026_May24_21-46-1eb839fd");
  const sessionDir = sessionArg
    ? path.isAbsolute(sessionArg)
      ? sessionArg
      : path.join(ROOT, sessionArg)
    : defaultSession;
  if (fs.existsSync(sessionDir)) {
    failed += evalSessionBriefing(sessionDir) ? 1 : 0;
  }

  const report = {
    generated_at: new Date().toISOString(),
    ok: failed === 0,
    session: fs.existsSync(sessionDir) ? path.relative(ROOT, sessionDir) : null,
    plan_turn_version: promptVersionFor(path.join(PROMPTS_DIR, "plan-turn.md")),
    eval_version: promptVersionFor(path.join(PROMPTS_DIR, "final-evaluation.md")),
  };
  const reportPath = path.join(ROOT, "logs/may/2026_May24_batch/eval-matrix-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${path.relative(ROOT, reportPath)}`);

  if (failed) {
    console.error(`\n${failed} eval check(s) FAILED\n`);
    process.exit(1);
  }
  console.log("\n✓ eval matrix passed.\n");
}

main();
