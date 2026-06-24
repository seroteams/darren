#!/usr/bin/env node
// M2 — compare post-adoption scores to May-24 baseline + ANALYSIS.md predicted ranges.
// Offline: node scripts/batch-m2-verify.js
// Live:    node scripts/batch-m2-verify.js --live  (all 10 batch personas; needs OPENAI_API_KEY)

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { loadEnv } = require("../backend/engine/env.ts");
const { scoreSessionDir, aggregateRuns } = require("./lib/session-scores");
const { SCENARIOS_DIR } = require("../backend/engine/paths.mts");

loadEnv();

const ROOT = path.join(__dirname, "..");
const BATCH_DIR = path.join(ROOT, "logs/may/2026_May24_batch");
const BASELINE_PATH = path.join(BATCH_DIR, "quality-report.json");
const BATCH_SCENARIOS = path.join(SCENARIOS_DIR, "batch");

const PREDICTED = {
  question_specificity: { min: 0.4, max: 0.6 },
  plan_thread_follow: { min: 0.55, max: 0.75 },
  plan_delta_accuracy: { min: 0.65, max: 0.75 },
};
const OVERALL_PREDICTED = { min: 0.87, max: 0.9, baseline: 0.829 };

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function compareToPredicted(aggregate, baselineDims) {
  const checks = [];
  for (const [dim, range] of Object.entries(PREDICTED)) {
    const mean = aggregate[dim]?.mean ?? 0;
    const base = baselineDims[dim];
    const inRange = mean >= range.min && mean <= range.max;
    const improved = typeof base === "number" && mean > base;
    checks.push({
      dimension: dim,
      mean: round(mean),
      baseline: base == null ? null : round(base),
      delta: base == null ? null : round(mean - base),
      predicted: `${range.min}–${range.max}`,
      ok: inRange || improved,
      in_predicted_range: inRange,
      improved_vs_baseline: improved,
    });
  }
  const overall = round(aggregate.overall_mean);
  checks.push({
    dimension: "overall_mean",
    mean: overall,
    baseline: OVERALL_PREDICTED.baseline,
    delta: round(overall - OVERALL_PREDICTED.baseline),
    predicted: `${OVERALL_PREDICTED.min}–${OVERALL_PREDICTED.max}`,
    ok: (overall >= OVERALL_PREDICTED.min && overall <= OVERALL_PREDICTED.max) || overall > OVERALL_PREDICTED.baseline,
    in_predicted_range: overall >= OVERALL_PREDICTED.min && overall <= OVERALL_PREDICTED.max,
    improved_vs_baseline: overall > OVERALL_PREDICTED.baseline,
  });
  return checks;
}

function batchScenarioFiles() {
  return fs
    .readdirSync(BATCH_SCENARIOS)
    .filter((f) => f.endsWith(".json") && f !== "_index.json")
    .map((f) => path.join(BATCH_SCENARIOS, f));
}

function batchToScenario(data) {
  return {
    name: data.name,
    role: data.role,
    roleTitle: data.role,
    seniority: data.seniority,
    meeting_type: data.meeting_type,
    manager_notes: data.manager_notes,
    observedShift: data.manager_notes,
  };
}

function listSessionDirs() {
  const out = [];
  const logsDir = path.join(ROOT, "logs");
  if (!fs.existsSync(logsDir)) return out;
  for (const month of fs.readdirSync(logsDir)) {
    const monthDir = path.join(logsDir, month);
    let entries;
    try {
      entries = fs.readdirSync(monthDir);
    } catch {
      continue;
    }
    for (const id of entries) {
      const dir = path.join(monthDir, id);
      if (fs.existsSync(path.join(dir, "transcript.json"))) out.push(dir);
    }
  }
  return out;
}

function discoverOfflineRuns() {
  const discovered = [];
  const batchFiles = batchScenarioFiles();
  for (const file of batchFiles) {
    const batch = loadJson(file);
    const scenario = batchToScenario(batch);
    const matches = [];
    for (const dir of listSessionDirs()) {
      const prepPath = path.join(dir, "01b-preparation/inputs.json");
      if (!fs.existsSync(prepPath)) continue;
      const inputs = loadJson(prepPath);
      if (inputs.name === batch.name && inputs.roleTitle === batch.role) {
        matches.push(dir);
      }
    }
    matches.sort();
    const sessionDir = matches[matches.length - 1];
    if (!sessionDir) continue;
    const scores = scoreSessionDir(sessionDir, scenario);
    discovered.push({
      label: `${batch.name} (${path.basename(file)})`,
      scenario: path.basename(file),
      session: path.relative(ROOT, sessionDir).replace(/\\/g, "/"),
      scores,
    });
  }
  // Always include Toby post-adoption anchor if present
  const tobyDir = path.join(ROOT, "logs/may/2026_May24_21-46-1eb839fd");
  if (fs.existsSync(path.join(tobyDir, "transcript.json")) && !discovered.some((d) => d.session.includes("2026_May24_21-46"))) {
    const tobyScenario = {
      name: "Toby",
      role: "Expert UX Designer",
      manager_notes: "He wants to become a lead but his communication methods suck",
    };
    discovered.push({
      label: "Toby (post-adoption anchor)",
      scenario: "toby_growth_lead.json",
      session: "logs/may/2026_May24_21-46-1eb839fd",
      scores: scoreSessionDir(tobyDir, tobyScenario),
    });
  }
  return discovered;
}

function scanSessions() {
  const out = [];
  const logsDir = path.join(ROOT, "logs");
  if (!fs.existsSync(logsDir)) return out;
  for (const month of fs.readdirSync(logsDir)) {
    const monthDir = path.join(logsDir, month);
    let entries;
    try {
      entries = fs.readdirSync(monthDir);
    } catch {
      continue;
    }
    for (const id of entries) out.push(path.join(month, id));
  }
  return out;
}

function runSmoke(scenarioPath) {
  return new Promise((resolve, reject) => {
    const before = new Set(scanSessions());
    const startedAt = Date.now();
    const child = spawn(process.execPath, ["smoke-test.js", scenarioPath], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stdout += c; });
    child.on("error", reject);
    child.on("exit", (code) => {
      const after = scanSessions().filter((d) => !before.has(d)).sort();
      const sessionRel = after[after.length - 1] || null;
      resolve({
        code,
        duration_ms: Date.now() - startedAt,
        sessionDir: sessionRel ? path.join(ROOT, "logs", sessionRel) : null,
        stdout,
      });
    });
  });
}

async function runLiveSweep() {
  const files = batchScenarioFiles();
  const runs = [];
  let smokeFailed = 0;
  console.log("\n─── Live batch sweep (10 personas) ───");
  for (const scenarioPath of files) {
    const batch = loadJson(scenarioPath);
    const scenario = batchToScenario(batch);
    const label = `${batch.name} (${path.basename(scenarioPath)})`;
    process.stdout.write(`  Running ${label}…`);
    const result = await runSmoke(scenarioPath);
    if (result.code !== 0 || !result.sessionDir) {
      console.log(` FAIL (exit ${result.code})`);
      smokeFailed += 1;
      continue;
    }
    const scores = scoreSessionDir(result.sessionDir, scenario);
    console.log(` OK (${(result.duration_ms / 1000).toFixed(0)}s)`);
    console.log(`    qspec ${scores.dimensions.question_specificity.evidence} → ${round(scores.dimensions.question_specificity.score)}`);
    console.log(`    thread ${scores.dimensions.plan_thread_follow.evidence} → ${round(scores.dimensions.plan_thread_follow.score)}`);
    console.log(`    delta ${scores.dimensions.plan_delta_accuracy.evidence} → ${round(scores.dimensions.plan_delta_accuracy.score)}`);
    runs.push({
      label,
      scenario: path.basename(scenarioPath),
      session: path.relative(ROOT, result.sessionDir).replace(/\\/g, "/"),
      scores,
    });
  }
  return { runs, smokeFailed };
}

function printComparison(checks) {
  console.log("\n─── M2 vs ANALYSIS.md predicted ranges ───");
  let failed = 0;
  for (const c of checks) {
    const tag = c.ok ? "PASS" : "WARN";
    if (!c.ok) failed += 1;
    const parts = [`${tag}  ${c.dimension}: mean ${c.mean} (predicted ${c.predicted})`];
    if (c.baseline != null) parts.push(`baseline ${c.baseline}, Δ ${c.delta >= 0 ? "+" : ""}${c.delta}`);
    if (c.in_predicted_range) parts.push("in range");
    else if (c.improved_vs_baseline) parts.push("improved vs baseline");
    console.log(`  ${parts.join(" · ")}`);
  }
  return failed;
}

async function main() {
  const live = process.argv.includes("--live");
  console.log("\n─── M2 May-24 comparison ───\n");

  const baseline = fs.existsSync(BASELINE_PATH) ? loadJson(BASELINE_PATH) : null;
  const baselineDims = baseline
    ? Object.fromEntries(
        baseline.dimensions
          .filter((d) => PREDICTED[d.dimension])
          .map((d) => [d.dimension, d.mean])
      )
    : {};

  if (baseline) {
    console.log("May-24 batch baseline (quality-report.json):");
    for (const [dim, range] of Object.entries(PREDICTED)) {
      console.log(`  ${dim}: ${baselineDims[dim]} → predicted ${range.min}–${range.max}`);
    }
    console.log(`  overall_mean: ${OVERALL_PREDICTED.baseline} → predicted ${OVERALL_PREDICTED.min}–${OVERALL_PREDICTED.max}`);
    console.log();
  }

  let runs = [];
  let smokeFailed = 0;
  let mode = "offline_discovered";

  if (live) {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not set — cannot run --live.\n");
      process.exit(2);
    }
    mode = "live_batch_sweep";
    const liveResult = await runLiveSweep();
    runs = liveResult.runs;
    smokeFailed = liveResult.smokeFailed;
  } else {
    console.log("─── Discovered post-adoption sessions (offline) ───");
    runs = discoverOfflineRuns();
    if (!runs.length) {
      console.error("  No scorable sessions found. Run with --live when OPENAI_API_KEY is set.\n");
      process.exit(2);
    }
    for (const r of runs) {
      console.log(`  ${r.label}`);
      console.log(`    session ${r.session}`);
      console.log(`    qspec ${r.scores.dimensions.question_specificity.evidence} → ${round(r.scores.dimensions.question_specificity.score)}`);
      console.log(`    thread ${r.scores.dimensions.plan_thread_follow.evidence} → ${round(r.scores.dimensions.plan_thread_follow.score)}`);
      console.log(`    delta ${r.scores.dimensions.plan_delta_accuracy.evidence} → ${round(r.scores.dimensions.plan_delta_accuracy.score)}`);
    }
    console.log(`\n  (${runs.length} session(s) — not full 26-run batch; use --live for full sweep)`);
  }

  const aggregate = aggregateRuns(runs);
  const checks = compareToPredicted(aggregate, baselineDims);
  const predictFailed = printComparison(checks);

  const report = {
    generated_at: new Date().toISOString(),
    batch: "M2",
    mode,
    run_count: runs.length,
    baseline_dimensions: baselineDims,
    predicted_ranges: { ...PREDICTED, overall_mean: OVERALL_PREDICTED },
    runs: runs.map((r) => ({
      label: r.label,
      scenario: r.scenario,
      session: r.session,
      question_specificity: round(r.scores.dimensions.question_specificity.score),
      plan_thread_follow: round(r.scores.dimensions.plan_thread_follow.score),
      plan_delta_accuracy: round(r.scores.dimensions.plan_delta_accuracy.score),
      mean: round(r.scores.mean),
      evidence: {
        question_specificity: r.scores.dimensions.question_specificity.evidence,
        plan_thread_follow: r.scores.dimensions.plan_thread_follow.evidence,
        plan_delta_accuracy: r.scores.dimensions.plan_delta_accuracy.evidence,
      },
    })),
    aggregate: {
      question_specificity: round(aggregate.question_specificity.mean),
      plan_thread_follow: round(aggregate.plan_thread_follow.mean),
      plan_delta_accuracy: round(aggregate.plan_delta_accuracy.mean),
      overall_mean: round(aggregate.overall_mean),
    },
    predicted_checks: checks,
    smoke_failures: smokeFailed,
    verdict: predictFailed === 0 && smokeFailed === 0 ? "pass" : "partial",
  };

  const reportPath = path.join(BATCH_DIR, "m2-comparison-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${path.relative(ROOT, reportPath)}`);

  if (smokeFailed) {
    console.log(`\n${smokeFailed} live smoke run(s) failed.\n`);
    process.exit(1);
  }
  console.log(
    predictFailed === 0
      ? "\n✓ M2 comparison passed — scores meet predicted ranges or beat baseline.\n"
      : `\n⚠ M2: ${predictFailed} dimension(s) outside predicted range and not improved vs baseline.\n`
  );
  process.exit(predictFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
