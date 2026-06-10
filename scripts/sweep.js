#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("../src/env");
const { scoreSessionDir, aggregateRuns } = require("./lib/session-scores");
const { judgeSession, computeVerdictTier } = require("./eval-judge");
const { runSmoke } = require("./lib/run-scenario");

loadEnv();

const ROOT = path.join(__dirname, "..");
const BATCH_DIR = path.join(ROOT, "scenarios", "batch");
const BATCH_INDEX = path.join(BATCH_DIR, "_index.json");
const SWEEPS_DIR = path.join(ROOT, "logs", "sweeps");

function loadJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function parseArgs(argv) {
  const args = { dryRun: false, typeFilter: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--type") args.typeFilter = String(argv[i + 1] || "").trim().toLowerCase();
  }
  return args;
}

function normalizeTypeSlug(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function listScenarios({ typeFilter = "" }) {
  const entries = loadJson(BATCH_INDEX, []);
  return entries
    .map((entry) => {
      const filePath = path.join(BATCH_DIR, entry.file);
      const scenario = loadJson(filePath);
      return {
        entry,
        filePath,
        scenario,
        typeSlug: normalizeTypeSlug(entry.meeting_type),
      };
    })
    .filter((row) => row.scenario)
    .filter((row) => {
      if (!typeFilter) return true;
      const tf = typeFilter.toLowerCase();
      return row.typeSlug.includes(tf);
    });
}

// runSmoke + session resolution live in scripts/lib/run-scenario.js (shared with gate.js).

function findPriorSweepReport() {
  if (!fs.existsSync(SWEEPS_DIR)) return null;
  const dirs = fs
    .readdirSync(SWEEPS_DIR)
    .filter((d) => fs.existsSync(path.join(SWEEPS_DIR, d, "report.json")))
    .sort();
  if (!dirs.length) return null;
  const latest = dirs[dirs.length - 1];
  return loadJson(path.join(SWEEPS_DIR, latest, "report.json"));
}

function tierCounts(runs) {
  const counts = { pass: 0, watch: 0, fail: 0 };
  for (const run of runs) {
    const tier = run.judge.verdict_tier || computeVerdictTier(run.judge);
    counts[tier] = (counts[tier] || 0) + 1;
  }
  return counts;
}

function summarizeByType(runs) {
  const byType = new Map();
  for (const run of runs) {
    const key = run.meeting_type;
    const tier = run.judge.verdict_tier || computeVerdictTier(run.judge);
    if (!byType.has(key)) {
      byType.set(key, {
        type: key,
        total: 0,
        pass: 0,
        watch: 0,
        fail: 0,
        heuristic_mean_sum: 0,
        judge_score_sum: 0,
      });
    }
    const row = byType.get(key);
    row.total += 1;
    row.heuristic_mean_sum += run.heuristics.mean;
    row.judge_score_sum += run.judge.score;
    row[tier] += 1;
  }
  return [...byType.values()].map((row) => ({
    type: row.type,
    total: row.total,
    pass: row.pass,
    watch: row.watch,
    fail: row.fail,
    heuristic_mean: round(row.heuristic_mean_sum / row.total),
    judge_mean: round(row.judge_score_sum / row.total),
  }));
}

function buildDigest({ generatedAt, runs, byType, priorReport }) {
  const tiers = tierCounts(runs);
  const fails = runs
    .filter((r) => (r.judge.verdict_tier || computeVerdictTier(r.judge)) === "fail")
    .sort((a, b) => a.judge.score - b.judge.score || a.heuristics.mean - b.heuristics.mean)
    .slice(0, 3);
  const watches = runs
    .filter((r) => (r.judge.verdict_tier || computeVerdictTier(r.judge)) === "watch")
    .sort((a, b) => a.judge.score - b.judge.score)
    .slice(0, 3);

  const lines = [];
  lines.push(`# Sweep digest (${generatedAt})`);
  lines.push("");
  lines.push(`- Total personas: ${runs.length}`);
  lines.push(`- Verdict tiers: pass ${tiers.pass} / watch ${tiers.watch} / fail ${tiers.fail}`);
  lines.push(`- Heuristic overall mean: ${round(aggregateRuns(runs.map((r) => ({ scores: r.heuristics }))).overall_mean)}`);
  if (priorReport?.aggregate_heuristics) {
    const cur = aggregateRuns(runs.map((r) => ({ scores: r.heuristics })));
    const prev = priorReport.aggregate_heuristics;
    lines.push(`- Delta vs prior sweep: qspec ${round(cur.question_specificity.mean - prev.question_specificity)} | thread ${round(cur.plan_thread_follow.mean - prev.plan_thread_follow)} | delta ${round(cur.plan_delta_accuracy.mean - prev.plan_delta_accuracy)} | overall ${round(cur.overall_mean - prev.overall_mean)}`);
  }
  lines.push("");
  lines.push("## Per-type");
  lines.push("");
  lines.push("| Meeting type | Pass | Watch | Fail | Judge mean | Heuristic mean |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const row of byType) {
    lines.push(`| ${row.type} | ${row.pass} | ${row.watch} | ${row.fail} | ${row.judge_mean} | ${row.heuristic_mean} |`);
  }
  lines.push("");

  if (fails.length) {
    lines.push("## Worst fails");
    lines.push("");
    for (const run of fails) {
      lines.push(`### ${run.name} (${run.scenario_file})`);
      lines.push(`- Meeting type: ${run.meeting_type}`);
      lines.push(`- Judge score: ${run.judge.score}/5 (${run.judge.verdict_tier})`);
      lines.push(`- Evidence: ${run.judge.evidence}`);
      if (run.judge.flags?.length) lines.push(`- Flags: ${run.judge.flags.join(" | ")}`);
      lines.push("");
    }
  }

  if (watches.length) {
    lines.push("## Watch list");
    lines.push("");
    for (const run of watches) {
      lines.push(`### ${run.name} (${run.scenario_file})`);
      lines.push(`- Judge score: ${run.judge.score}/5`);
      lines.push(`- Evidence: ${run.judge.evidence}`);
      if (run.judge.flags?.length) lines.push(`- Flags: ${run.judge.flags.join(" | ")}`);
      lines.push("");
    }
  }

  if (!fails.length && !watches.length) {
    lines.push("## Result");
    lines.push("");
    lines.push("- All personas passed.");
    lines.push("");
  }
  return lines.join("\n");
}

function buildTrail({ generatedAt, args, reportDir, scenarios, runs, failures, elapsedMs }) {
  const lines = [];
  lines.push(`# Sweep trail (${generatedAt})`);
  lines.push("");
  lines.push("## Command");
  lines.push("");
  lines.push(`- node scripts/sweep.js${args.dryRun ? " --dry-run" : ""}${args.typeFilter ? ` --type ${args.typeFilter}` : ""}`);
  lines.push("");
  lines.push("## Scenario set");
  lines.push("");
  for (const row of scenarios) {
    lines.push(`- ${row.entry.name} | ${row.entry.meeting_type} | ${row.entry.file}`);
  }
  lines.push("");
  lines.push("## Output");
  lines.push("");
  lines.push(`- Report directory: ${path.relative(ROOT, reportDir).replace(/\\/g, "/")}`);
  lines.push(`- Completed runs: ${runs.length}`);
  lines.push(`- Failures: ${failures.length}`);
  lines.push(`- Elapsed: ${round(elapsedMs / 1000)}s`);
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Heuristic scoring from scripts/lib/session-scores.js");
  lines.push("- LLM judge scoring from scripts/eval-judge.js (judge model from config/models.json \"judge\")");
  return lines.join("\n");
}

async function runSweep(args) {
  const scenarios = listScenarios({ typeFilter: args.typeFilter });
  if (!scenarios.length) {
    throw new Error("No scenarios found for requested filter.");
  }
  if (args.dryRun) {
    console.log(`Dry run: ${scenarios.length} scenario(s)`);
    for (const row of scenarios) {
      console.log(`- ${row.entry.name} | ${row.entry.meeting_type} | ${row.entry.file}`);
    }
    return { dryRun: true };
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set.");
  }

  const runs = [];
  const failures = [];
  const startedAt = Date.now();
  for (const row of scenarios) {
    const label = `${row.entry.name} (${row.entry.file})`;
    process.stdout.write(`Running ${label}...`);
    const smoke = await runSmoke(row.filePath);
    if (smoke.code !== 0 || !smoke.sessionDir) {
      console.log(` FAIL (exit ${smoke.code})`);
      failures.push({
        scenario_file: row.entry.file,
        name: row.entry.name,
        meeting_type: row.entry.meeting_type,
        reason: `smoke failed exit=${smoke.code}`,
      });
      continue;
    }

    const heuristics = scoreSessionDir(smoke.sessionDir, row.scenario);
    let judge;
    try {
      judge = await judgeSession({
        sessionDir: smoke.sessionDir,
        scenario: row.scenario,
      });
    } catch (error) {
      console.log(" FAIL (judge error)");
      failures.push({
        scenario_file: row.entry.file,
        name: row.entry.name,
        meeting_type: row.entry.meeting_type,
        reason: `judge failed: ${error.message}`,
      });
      continue;
    }

    console.log(` OK (${round(smoke.duration_ms / 1000)}s)`);
    runs.push({
      scenario_file: row.entry.file,
      name: row.entry.name,
      meeting_type: row.entry.meeting_type,
      session: path.relative(ROOT, smoke.sessionDir).replace(/\\/g, "/"),
      heuristics,
      judge,
    });
  }

  const generatedAt = new Date().toISOString();
  const priorReport = findPriorSweepReport();
  const reportDir = path.join(SWEEPS_DIR, timestampSlug(new Date()));
  fs.mkdirSync(reportDir, { recursive: true });
  const byType = summarizeByType(runs);
  const aggregate = runs.length ? aggregateRuns(runs.map((r) => ({ scores: r.heuristics }))) : null;
  const tiers = tierCounts(runs);
  const report = {
    generated_at: generatedAt,
    run_count: runs.length,
    failures,
    verdict_tiers: tiers,
    prior_sweep: priorReport?.generated_at || null,
    aggregate_heuristics: aggregate
      ? {
          question_specificity: round(aggregate.question_specificity.mean),
          plan_thread_follow: round(aggregate.plan_thread_follow.mean),
          plan_delta_accuracy: round(aggregate.plan_delta_accuracy.mean),
          overall_mean: round(aggregate.overall_mean),
        }
      : null,
    by_type: byType,
    runs,
    verdict: failures.length === 0 && tiers.fail === 0 ? (tiers.watch ? "partial" : "pass") : "partial",
  };
  if (priorReport) {
    fs.writeFileSync(path.join(reportDir, "baseline.json"), `${JSON.stringify({ prior: priorReport.generated_at, current: generatedAt }, null, 2)}\n`);
  }
  fs.writeFileSync(path.join(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "DIGEST.md"), `${buildDigest({ generatedAt, runs, byType, priorReport })}\n`);
  fs.writeFileSync(
    path.join(reportDir, "TRAIL.md"),
    `${buildTrail({
      generatedAt,
      args,
      reportDir,
      scenarios,
      runs,
      failures,
      elapsedMs: Date.now() - startedAt,
    })}\n`
  );

  console.log(`\nReport directory: ${path.relative(ROOT, reportDir).replace(/\\/g, "/")}`);
  console.log(`DIGEST: ${path.relative(ROOT, path.join(reportDir, "DIGEST.md")).replace(/\\/g, "/")}`);
  console.log(`TRAIL: ${path.relative(ROOT, path.join(reportDir, "TRAIL.md")).replace(/\\/g, "/")}`);

  if (failures.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runSweep(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runSweep, listScenarios, parseArgs };
