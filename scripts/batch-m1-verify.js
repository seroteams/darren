#!/usr/bin/env node
// M1 — May-24 batch verification (FX-44).
// Offline: prompt adoption checks + dimension scorers on session logs.
// Live:    node scripts/batch-m1-verify.js --live [scenario-file...]
//           (defaults to 3 regression picks: Priya, Lin, Ahmed)

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { loadEnv } = require("../backend/engine/env.ts");
const { CONTENT_DIR, SCENARIOS_DIR } = require("../backend/engine/paths.mts");

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

const PROMPT_HUNKS = [
  {
    id: "persona-grounding",
    file: "prompts/generate-questions.md",
    needles: ["**Ground in persona.**", "At least half the questions must reference"],
  },
  {
    id: "thread-follow-bias",
    file: "prompts/plan-turn.md",
    needles: ["**BIAS: When in doubt whether something is a thread, follow it.**"],
  },
  {
    id: "anti-neutral-calibration",
    file: "prompts/plan-turn.md",
    needles: ["**CALIBRATION: In real 1:1 data, fewer than 15% of substantive"],
  },
  {
    id: "honor-commitments-fx09",
    file: "prompts/plan-turn.md",
    needles: ["**Honor open commitments.**"],
  },
  {
    id: "dont-echo-stem-fx10",
    file: "prompts/plan-turn.md",
    needles: ["**Don't echo the stem.**"],
  },
];

const DEFAULT_LIVE = [
  "priya-biweekly-checkin.json",
  "lin-biweekly-checkin.json",
  "ahmed-growth-career-plan.json",
];

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function checkPromptAdoption() {
  const results = [];
  let failed = 0;
  for (const hunk of PROMPT_HUNKS) {
    const text = fs.readFileSync(path.join(CONTENT_DIR, hunk.file), "utf8");
    const missing = hunk.needles.filter((n) => !text.includes(n));
    const ok = missing.length === 0;
    results.push({ id: hunk.id, file: hunk.file, ok, missing });
    if (!ok) failed += 1;
  }
  return { results, failed };
}

function personaTerms(scenario) {
  const terms = new Set();
  const addWords = (text) => {
    for (const w of String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
      if (w.length >= 4) terms.add(w);
    }
  };
  if (scenario.name) terms.add(scenario.name.toLowerCase());
  addWords(scenario.role);
  addWords(scenario.manager_notes);
  for (const kw of ["ux", "ui", "api", "lead"]) {
    const blob = `${scenario.role} ${scenario.manager_notes}`.toLowerCase();
    if (blob.includes(kw)) terms.add(kw);
  }
  return [...terms];
}

function questionMentionsPersona(text, terms) {
  const lower = String(text || "").toLowerCase();
  return terms.some((t) => lower.includes(t));
}

function scoreQuestionSpecificity(bankQuestions, scenario) {
  const qs = Array.isArray(bankQuestions) ? bankQuestions : [];
  if (!qs.length) return { score: 0, evidence: "0/0 bank questions" };
  const terms = personaTerms(scenario);
  const grounded = qs.filter((q) => questionMentionsPersona(q.name, terms)).length;
  return { score: grounded / qs.length, evidence: `${grounded}/${qs.length} mention persona` };
}

function isSkipOrShallow(answer) {
  const a = String(answer || "").trim();
  if (!a) return true;
  const words = a.split(/\s+/).filter(Boolean);
  return words.length <= 3;
}

function answerHasThread(answer) {
  const a = String(answer || "").trim();
  if (isSkipOrShallow(a)) return false;
  if (/^(fine|ok|yeah|yes|no|good|not much)\.?$/i.test(a)) return false;
  return a.split(/\s+/).length >= 5;
}

function followReferencesAnswer(answer, questionName) {
  const words = String(answer || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const q = String(questionName || "").toLowerCase();
  if (!words.length) return false;
  const hits = words.filter((w) => q.includes(w));
  return hits.length >= 1;
}

function scoreThreadFollow(transcript) {
  let threads = 0;
  let followed = 0;
  for (let i = 0; i < transcript.length - 1; i += 1) {
    const turn = transcript[i];
    const next = transcript[i + 1];
    if (!answerHasThread(turn.answer) || turn.skipped) continue;
    threads += 1;
    const nextQ = next?.question || {};
    if (nextQ.source === "planner_added" && followReferencesAnswer(turn.answer, nextQ.name)) {
      followed += 1;
    }
  }
  const score = threads ? followed / threads : 1;
  return { score, evidence: `${followed}/${threads} threads followed` };
}

function scoreDeltaAccuracy(transcript) {
  let substantive = 0;
  let scored = 0;
  for (const turn of transcript) {
    if (turn.skipped || isSkipOrShallow(turn.answer)) continue;
    substantive += 1;
    const deltas = turn.realized_deltas || {};
    if (Object.values(deltas).some((v) => v !== 0)) scored += 1;
  }
  const score = substantive ? scored / substantive : 1;
  return { score, evidence: `${scored}/${substantive} turns scored non-zero` };
}

function loadBankQuestions(sessionDir) {
  const bankPath = path.join(sessionDir, "03-question-bank/response.json");
  if (!fs.existsSync(bankPath)) return [];
  const data = loadJson(bankPath);
  if (Array.isArray(data.questions)) return data.questions;
  if (typeof data.raw === "string") {
    try {
      const parsed = JSON.parse(data.raw);
      return Array.isArray(parsed.questions) ? parsed.questions : [];
    } catch {
      return [];
    }
  }
  return [];
}

function loadScenarioArg(file) {
  const candidates = [
    path.isAbsolute(file) ? file : null,
    path.join(BATCH_SCENARIOS, file.endsWith(".json") ? file : `${file}.json`),
    path.join(ROOT, file),
    path.join(SCENARIOS_DIR, "regression", file.endsWith(".json") ? file : `${file}.json`),
  ].filter(Boolean);
  const scenarioPath = candidates.find((p) => fs.existsSync(p));
  if (!scenarioPath) {
    throw new Error(`Scenario not found: ${file}`);
  }
  const data = loadJson(scenarioPath);
  if (data.prep) {
    return {
      path: scenarioPath,
      scenario: {
        name: data.prep.name,
        role: data.prep.role,
        seniority: data.prep.seniority,
        meeting_type: data.prep.meetingType,
        manager_notes: data.prep.notes || "",
      },
    };
  }
  return { path: scenarioPath, scenario: data };
}

function scoreSessionDir(sessionDir, scenario) {
  const transcriptPath = path.join(sessionDir, "transcript.json");
  const bankQuestions = loadBankQuestions(sessionDir);
  const transcript = fs.existsSync(transcriptPath) ? loadJson(transcriptPath) : [];

  const qspec = scoreQuestionSpecificity(bankQuestions, scenario);
  const thread = scoreThreadFollow(transcript);
  const delta = scoreDeltaAccuracy(transcript);

  const dims = {
    question_specificity: qspec,
    plan_thread_follow: thread,
    plan_delta_accuracy: delta,
  };
  const mean =
    (qspec.score + thread.score + delta.score) / 3;

  return { dimensions: dims, mean };
}

function aggregateRuns(runs) {
  const keys = ["question_specificity", "plan_thread_follow", "plan_delta_accuracy"];
  const out = {};
  for (const k of keys) {
    const scores = runs.map((r) => r.scores.dimensions[k].score);
    out[k] = {
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      n: scores.length,
    };
  }
  out.overall_mean = runs.reduce((a, r) => a + r.scores.mean, 0) / runs.length;
  return out;
}

function compareToPredicted(aggregate, baselineDims = {}) {
  const checks = [];
  for (const [dim, range] of Object.entries(PREDICTED)) {
    const mean = aggregate[dim]?.mean ?? 0;
    const base = baselineDims[dim];
    const inRange = mean >= range.min && mean <= range.max;
    const improved = typeof base === "number" && mean > base;
    const ok = inRange || improved;
    checks.push({
      dimension: dim,
      mean: round(mean),
      baseline: base == null ? null : round(base),
      predicted: `${range.min}–${range.max}`,
      ok,
    });
  }
  return checks;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

const DEFAULT_PROXY = [
  { session: "logs/may/2026_May24_21-46-1eb839fd", scenario: "toby_growth_lead.json", label: "Toby post-adoption (May24)" },
];

async function writeProxyReport(adoption) {
  const baseline = fs.existsSync(BASELINE_PATH) ? loadJson(BASELINE_PATH) : null;
  const runs = [];
  for (const item of DEFAULT_PROXY) {
    const sessionDir = path.join(ROOT, item.session);
    const { scenario } = loadScenarioArg(item.scenario);
    const scores = scoreSessionDir(sessionDir, scenario);
    runs.push({
      label: item.label,
      scenario: item.scenario,
      session: item.session,
      question_specificity: round(scores.dimensions.question_specificity.score),
      plan_thread_follow: round(scores.dimensions.plan_thread_follow.score),
      plan_delta_accuracy: round(scores.dimensions.plan_delta_accuracy.score),
      mean: round(scores.mean),
      evidence: {
        question_specificity: scores.dimensions.question_specificity.evidence,
        plan_thread_follow: scores.dimensions.plan_thread_follow.evidence,
        plan_delta_accuracy: scores.dimensions.plan_delta_accuracy.evidence,
      },
    });
  }
  const aggregate = aggregateRuns(runs.map((r) => ({ scores: {
    mean: r.mean,
    dimensions: {
      question_specificity: { score: r.question_specificity },
      plan_thread_follow: { score: r.plan_thread_follow },
      plan_delta_accuracy: { score: r.plan_delta_accuracy },
    },
  } })));
  const baselineDims = baseline
    ? Object.fromEntries(
        baseline.dimensions
          .filter((d) => PREDICTED[d.dimension])
          .map((d) => [d.dimension, d.mean])
      )
    : {};
  const predictedChecks = compareToPredicted(aggregate, baselineDims);
  const report = {
    generated_at: new Date().toISOString(),
    batch: "M1",
    mode: "proxy_offline",
    fx44: predictedChecks.every((c) => c.ok) ? "pass_proxy" : "partial",
    note: "Prompt hunks verified. Proxy scores from post-adoption session logs. Full --live batch sweep requires OPENAI_API_KEY.",
    prompt_adoption: adoption.results,
    baseline_dimensions: baseline
      ? Object.fromEntries(
          baseline.dimensions
            .filter((d) => PREDICTED[d.dimension])
            .map((d) => [d.dimension, d.mean])
        )
      : null,
    proxy_runs: runs,
    aggregate: {
      question_specificity: round(aggregate.question_specificity.mean),
      plan_thread_follow: round(aggregate.plan_thread_follow.mean),
      plan_delta_accuracy: round(aggregate.plan_delta_accuracy.mean),
      overall_mean: round(aggregate.overall_mean),
    },
    predicted_checks: predictedChecks,
    live_command: "node scripts/batch-m1-verify.js --live",
  };
  const reportPath = path.join(BATCH_DIR, "m1-rerun-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  return { report, reportPath, predictedChecks };
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

async function main() {
  const live = process.argv.includes("--live");
  const scoreSessionIdx = process.argv.indexOf("--score-session");
  const scoreSessionDirArg =
    scoreSessionIdx >= 0 ? process.argv[scoreSessionIdx + 1] : null;
  const scenarioFlagIdx = process.argv.indexOf("--scenario");
  const scenarioFlagArg =
    scenarioFlagIdx >= 0 ? process.argv[scenarioFlagIdx + 1] : null;
  const fileArgs = process.argv
    .slice(2)
    .filter((a, i, arr) => {
      if (a.startsWith("--")) return false;
      if (i > 0 && arr[i - 1] === "--score-session") return false;
      if (i > 0 && arr[i - 1] === "--scenario") return false;
      return true;
    });

  console.log("\n─── M1 May-24 verification (FX-44) ───\n");

  const baseline = fs.existsSync(BASELINE_PATH) ? loadJson(BASELINE_PATH) : null;
  if (baseline) {
    const b = baseline.dimensions.filter((d) =>
      ["question_specificity", "plan_thread_follow", "plan_delta_accuracy"].includes(d.dimension)
    );
    console.log("Baseline (2026-05-24 batch):");
    for (const d of b) console.log(`  ${d.dimension}: mean ${d.mean}`);
    console.log();
  }

  console.log("─── Prompt adoption (offline) ───");
  const adoption = checkPromptAdoption();
  for (const r of adoption.results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.id} (${r.file})`);
    if (r.missing.length) console.log(`        missing: ${r.missing.join("; ")}`);
  }
  if (adoption.failed) {
    console.log(`\n${adoption.failed} prompt hunk(s) missing — FX-44 blocked.\n`);
    process.exit(1);
  }

  if (scoreSessionDirArg) {
    const sessionDir = path.isAbsolute(scoreSessionDirArg)
      ? scoreSessionDirArg
      : path.join(ROOT, scoreSessionDirArg);
    if (!fs.existsSync(sessionDir)) {
      console.error(`Session dir not found: ${sessionDir}`);
      process.exit(2);
    }
    let scenario;
    if (scenarioFlagArg) {
      scenario = loadScenarioArg(scenarioFlagArg).scenario;
    } else {
      const prep = path.join(sessionDir, "01b-preparation/inputs.json");
      if (!fs.existsSync(prep)) {
        console.error("Pass --scenario <file> when inputs.json missing.");
        process.exit(2);
      }
      const inputs = loadJson(prep);
      scenario = {
        name: inputs.name,
        role: inputs.roleTitle,
        seniority: inputs.seniority,
        manager_notes: inputs.observedShift || "",
      };
    }
    const scores = scoreSessionDir(sessionDir, scenario);
    console.log("\n─── Offline session score ───");
    console.log(`  session: ${path.relative(ROOT, sessionDir)}`);
    console.log(`  qspec  ${scores.dimensions.question_specificity.evidence} → ${round(scores.dimensions.question_specificity.score)}`);
    console.log(`  thread ${scores.dimensions.plan_thread_follow.evidence} → ${round(scores.dimensions.plan_thread_follow.score)}`);
    console.log(`  delta  ${scores.dimensions.plan_delta_accuracy.evidence} → ${round(scores.dimensions.plan_delta_accuracy.score)}`);
    console.log(`  mean   ${round(scores.mean)}\n`);
    process.exit(0);
  }

  if (!live) {
    console.log("\n─── Proxy session scores (post-adoption logs) ───");
    const { reportPath, predictedChecks } = await writeProxyReport(adoption);
    for (const r of JSON.parse(fs.readFileSync(reportPath, "utf8")).proxy_runs) {
      console.log(`  ${r.label}`);
      console.log(`    qspec ${r.evidence.question_specificity} → ${r.question_specificity}`);
      console.log(`    thread ${r.evidence.plan_thread_follow} → ${r.plan_thread_follow}`);
      console.log(`    delta ${r.evidence.plan_delta_accuracy} → ${r.plan_delta_accuracy}`);
    }
    console.log("\n─── Proxy vs predicted ranges ───");
    for (const c of predictedChecks) {
      console.log(`  ${c.ok ? "PASS" : "WARN"}  ${c.dimension}: ${c.mean} (predicted ${c.predicted})`);
    }
    console.log(`\nReport: ${path.relative(ROOT, reportPath)}`);
    console.log("\n  Prompt hunks verified. Run with --live when OPENAI_API_KEY is set.\n");
    process.exit(0);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("\nOPENAI_API_KEY not set — cannot run --live.\n");
    process.exit(2);
  }

  const files = fileArgs.length
    ? fileArgs.map((f) => (f.endsWith(".json") ? f : `${f}.json`))
    : DEFAULT_LIVE;

  console.log("\n─── Live smoke + dimension scoring ───");
  const runs = [];
  let smokeFailed = 0;

  for (const file of files) {
    let scenarioPath;
    let scenario;
    try {
      ({ path: scenarioPath, scenario } = loadScenarioArg(file));
    } catch (e) {
      console.error(`  SKIP  ${e.message}`);
      smokeFailed += 1;
      continue;
    }
    const label = `${scenario.name} (${path.basename(scenarioPath)})`;
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
    console.log(`    delta  ${scores.dimensions.plan_delta_accuracy.evidence} → ${round(scores.dimensions.plan_delta_accuracy.score)}`);
    runs.push({
      scenario: path.basename(scenarioPath),
      name: scenario.name,
      sessionDir: path.relative(ROOT, result.sessionDir),
      scores,
    });
  }

  if (!runs.length) {
    console.log("\nNo successful live runs.\n");
    process.exit(1);
  }

  const aggregate = aggregateRuns(runs);
  const baselineDims = baseline
    ? Object.fromEntries(
        baseline.dimensions
          .filter((d) => PREDICTED[d.dimension])
          .map((d) => [d.dimension, d.mean])
      )
    : {};
  const predictedChecks = compareToPredicted(aggregate, baselineDims);

  console.log("\n─── Aggregate vs ANALYSIS.md predicted ranges ───");
  let predictFailed = 0;
  for (const c of predictedChecks) {
    console.log(`  ${c.ok ? "PASS" : "WARN"}  ${c.dimension}: mean ${c.mean} (predicted ${c.predicted})`);
    if (!c.ok) predictFailed += 1;
  }
  console.log(`  overall mean: ${round(aggregate.overall_mean)} (baseline overall ~0.829, predicted 0.87–0.90)`);

  const report = {
    generated_at: new Date().toISOString(),
    batch: "M1",
    fx44: predictFailed === 0 && smokeFailed === 0 ? "pass" : "partial",
    prompt_adoption: adoption.results,
    baseline_dimensions: baseline
      ? Object.fromEntries(
          baseline.dimensions
            .filter((d) => PREDICTED[d.dimension])
            .map((d) => [d.dimension, d.mean])
        )
      : null,
    live_runs: runs.map((r) => ({
      scenario: r.scenario,
      name: r.name,
      session: r.sessionDir,
      question_specificity: round(r.scores.dimensions.question_specificity.score),
      plan_thread_follow: round(r.scores.dimensions.plan_thread_follow.score),
      plan_delta_accuracy: round(r.scores.dimensions.plan_delta_accuracy.score),
      mean: round(r.scores.mean),
    })),
    aggregate: {
      question_specificity: round(aggregate.question_specificity.mean),
      plan_thread_follow: round(aggregate.plan_thread_follow.mean),
      plan_delta_accuracy: round(aggregate.plan_delta_accuracy.mean),
      overall_mean: round(aggregate.overall_mean),
    },
    predicted_checks: predictedChecks,
    smoke_failures: smokeFailed,
  };

  const reportPath = path.join(BATCH_DIR, "m1-rerun-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${path.relative(ROOT, reportPath)}`);

  const exitCode = adoption.failed || smokeFailed ? 1 : 0;
  console.log(exitCode === 0 && predictFailed === 0
    ? "\n✓ M1 verification passed — FX-44 ready to flip DONE.\n"
    : predictFailed
      ? `\n⚠ M1 live scores outside predicted ranges (${predictFailed} dim(s)) — review report before flipping FX-44.\n`
      : "\n");
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
