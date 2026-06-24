#!/usr/bin/env node
// Trust regression gate.
//
// Re-runs the human-ratified golden set through the live pipeline and applies
// the deterministic trust checks (evals/trust-checks.js). Deterministic
// hard-fails alone decide pass/fail; the LLM judge (--judge) only attaches
// advisory warnings and can never flip a verdict.
//
//   npm run gate                      all cases, deterministic only
//   node scripts/gate.js --judge      add advisory judge warnings
//   node scripts/gate.js --only <id>  one case
//   node scripts/gate.js --update-baseline   freeze current verdicts as expected
//   node scripts/gate.js --json       machine-readable result
//
// Exit: 0 PASS · 1 FAIL/regression · 2 infra error.

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("../backend/engine/env.ts");
const { runSmoke } = require("./lib/run-scenario");
const { scoreSessionDir, loadBankQuestions } = require("./lib/session-scores");
const { runTrustChecks } = require("../evals/trust-checks");
const { CONTENT_DIR } = require("../backend/engine/paths.mts");

loadEnv();

const ROOT = path.join(__dirname, "..");
const GOLDEN_DIR = path.join(ROOT, "evals", "golden");
const RANK = { PASS: 0, WARN: 1, FAIL: 2 };

function loadJson(filePath, fallback = undefined) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = { only: "", judge: false, updateBaseline: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--only") args.only = String(argv[i + 1] || "").trim();
    if (t === "--judge") args.judge = true;
    if (t === "--update-baseline") args.updateBaseline = true;
    if (t === "--json") args.json = true;
  }
  return args;
}

function loadGoldenCases(only) {
  const index = loadJson(path.join(GOLDEN_DIR, "_index.json"), []);
  const cases = index
    .map((row) => {
      const file = path.join(GOLDEN_DIR, row.file);
      const def = loadJson(file);
      return def ? { ...def, _file: file } : null;
    })
    .filter(Boolean);
  return only ? cases.filter((c) => c.id === only) : cases;
}

// Parse the final briefing, tolerating the {raw: "<json>"} double-encoding the
// pipeline sometimes writes. Returns null on unparseable output (→ SCHEMA_INVALID).
function loadBriefing(sessionDir) {
  const p = path.join(sessionDir, "05-evaluation", "response.json");
  if (!fs.existsSync(p)) return null;
  try {
    let b = JSON.parse(fs.readFileSync(p, "utf8"));
    if (b && typeof b.raw === "string") b = JSON.parse(b.raw);
    return b;
  } catch {
    return null;
  }
}

function loadFocusPoints(sessionDir) {
  const fp = loadJson(path.join(sessionDir, "01-focus-points", "response.json"), null);
  return fp?.focus_points || [];
}

function loadTranscript(sessionDir) {
  return loadJson(path.join(sessionDir, "transcript.json"), []);
}

// A run is usable by the gate once the pipeline has written a complete session
// (transcript + final evaluation). We judge on that, NOT on smoke-test.js's exit
// code: smoke's code reflects ITS own quality assertions (e.g. "some turn moved
// the axes"), which legitimately fail on adversarial scenarios like thin-answers
// — where the honest behaviour is to NOT move the read. Letting that disable the
// gate would silently retire the trust checks (incl. the honesty sentinel).
function sessionComplete(sessionDir) {
  if (!sessionDir) return false;
  return (
    fs.existsSync(path.join(sessionDir, "transcript.json")) &&
    fs.existsSync(path.join(sessionDir, "05-evaluation", "response.json"))
  );
}

async function runOneCase(def, args) {
  const scenarioPath = path.join(CONTENT_DIR, def.scenario);
  const scenario = loadJson(scenarioPath);
  if (!scenario) {
    return { id: def.id, kind: def.kind, status: "error", error: `scenario not found: ${def.scenario}` };
  }

  // Run pipeline; retry once on an infra failure so a flaky API call is not read
  // as a quality regression.
  let smoke = await runSmoke(scenarioPath);
  if (!sessionComplete(smoke.sessionDir)) {
    smoke = await runSmoke(scenarioPath);
  }
  if (!sessionComplete(smoke.sessionDir)) {
    return { id: def.id, kind: def.kind, status: "error", error: `pipeline incomplete (exit ${smoke.code})` };
  }

  const briefing = loadBriefing(smoke.sessionDir);
  const transcript = loadTranscript(smoke.sessionDir);
  const bankQuestions = loadBankQuestions(smoke.sessionDir);
  const focusPoints = loadFocusPoints(smoke.sessionDir);
  let metrics = null;
  try {
    const s = scoreSessionDir(smoke.sessionDir, scenario);
    metrics = {
      question_specificity: s.dimensions.question_specificity.score,
      plan_thread_follow: s.dimensions.plan_thread_follow.score,
      plan_delta_accuracy: s.dimensions.plan_delta_accuracy.score,
      opener_link: s.dimensions.opener_link.score,
      on_brief: s.dimensions.on_brief.score,
      mean: s.mean,
    };
  } catch { /* metrics are diagnostic only */ }

  const checks = runTrustChecks({
    briefing,
    transcript,
    managerNotes: scenario.manager_notes || "",
    bankQuestions,
    focusPoints,
    meetingType: scenario.meeting_type,
    ctx: { role: scenario.role, seniority: scenario.seniority },
    metrics,
  });

  // Judge is advisory only: its flags become warnings, they never change the
  // deterministic verdict or the regression status.
  const warnings = [...checks.warnings];
  if (args.judge) {
    try {
      const { judgeSession } = require("./eval-judge");
      const judged = await judgeSession({ sessionDir: smoke.sessionDir, scenario });
      for (const f of judged.flags || []) warnings.push(`judge(${judged.score}/5): ${f}`);
    } catch (e) {
      warnings.push(`judge unavailable: ${e.message}`);
    }
  }

  const expected = def.expect || { verdict: "PASS", hard_fails: [] };
  // Regression is decided by deterministic hard-fails only: any hard-fail not
  // already in the ratified baseline.
  const newHardFails = checks.hard_fails.filter((h) => !(expected.hard_fails || []).includes(h));
  const regressed = newHardFails.length > 0 || RANK[checks.verdict] > RANK[expected.verdict];

  return {
    id: def.id,
    kind: def.kind,
    session: path.relative(ROOT, smoke.sessionDir).replace(/\\/g, "/"),
    expected,
    actual: { verdict: checks.verdict, hard_fails: checks.hard_fails, warnings, details: checks.details, metrics: checks.metrics, read_quality: checks.read_quality },
    status: regressed ? "regressed" : "ok",
  };
}

function updateBaseline(cases, results) {
  const byId = new Map(results.map((r) => [r.id, r]));
  for (const def of cases) {
    const r = byId.get(def.id);
    if (!r || r.status === "error") continue;
    // Never bless a trust hard-fail on an adversarial sentinel.
    if (def.kind === "adversarial" && r.actual.hard_fails.length) {
      console.warn(`  refusing to baseline ${def.id}: sentinel is failing (${r.actual.hard_fails.join(", ")}) — fix it, don't baseline it.`);
      continue;
    }
    const next = { ...def };
    delete next._file;
    next.expect = { verdict: r.actual.verdict, hard_fails: r.actual.hard_fails };
    fs.writeFileSync(def._file, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`  baselined ${def.id} → ${r.actual.verdict}`);
  }
}

function printTable(results) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\n  ${pad("case", 20)}${pad("kind", 13)}${pad("expected", 10)}${pad("actual", 10)}status`);
  console.log(`  ${"-".repeat(66)}`);
  for (const r of results) {
    if (r.status === "error") {
      console.log(`  ${pad(r.id, 20)}${pad(r.kind, 13)}${pad("-", 10)}${pad("ERROR", 10)}${r.error}`);
      continue;
    }
    const mark = r.status === "regressed" ? "REGRESSED" : "ok";
    console.log(`  ${pad(r.id, 20)}${pad(r.kind, 13)}${pad(r.expected.verdict, 10)}${pad(r.actual.verdict, 10)}${mark}`);
    if (r.actual.hard_fails.length) console.log(`      hard_fails: ${r.actual.hard_fails.join(", ")}`);
    for (const d of r.actual.details || []) console.log(`      · ${d}`);
    for (const w of r.actual.warnings || []) console.log(`      ~ ${w}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = loadGoldenCases(args.only);
  if (!cases.length) {
    console.error(args.only ? `No golden case "${args.only}".` : "No golden cases in evals/golden/_index.json.");
    process.exit(2);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set — the gate re-runs the live pipeline and needs it.");
    process.exit(2);
  }

  console.log(`\nTrust gate — ${cases.length} case(s)${args.judge ? " (with judge)" : ""}\n`);
  const results = [];
  for (const def of cases) {
    process.stdout.write(`  running ${def.id} ...`);
    const r = await runOneCase(def, args);
    process.stdout.write(` ${r.status}\n`);
    results.push(r);
  }

  printTable(results);

  const hasError = results.some((r) => r.status === "error");
  const hasRegression = results.some((r) => r.status === "regressed");
  const hasWarning = results.some((r) => (r.actual?.warnings || []).length);
  const verdict = hasError ? "ERROR" : hasRegression ? "FAIL" : hasWarning ? "WARN" : "PASS";

  const generatedAt = new Date().toISOString();
  const reportDir = path.join(ROOT, "logs", "gate", generatedAt.replaceAll(":", "-").replaceAll(".", "-"));
  fs.mkdirSync(reportDir, { recursive: true });
  const report = { generated_at: generatedAt, verdict, cases: results, summary: `${results.filter((r) => r.status === "ok").length} ok / ${results.filter((r) => r.status === "regressed").length} regressed / ${results.filter((r) => r.status === "error").length} error` };
  fs.writeFileSync(path.join(reportDir, "result.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (args.updateBaseline) {
    console.log("\nUpdating baseline:");
    updateBaseline(cases, results);
  }

  if (args.json) console.log(JSON.stringify(report, null, 2));
  console.log(`\n  ${verdict}  (${report.summary})`);
  console.log(`  report: ${path.relative(ROOT, path.join(reportDir, "result.json")).replace(/\\/g, "/")}\n`);

  process.exit(hasError ? 2 : hasRegression ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
