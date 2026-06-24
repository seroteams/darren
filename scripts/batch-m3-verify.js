#!/usr/bin/env node
// M3 — pin May-24 worst-case runs as regression fixtures.
// Offline: node scripts/batch-m3-verify.js
// Live prep: node scripts/batch-m3-verify.js --live  (needs OPENAI_API_KEY)

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { SCENARIOS_DIR } = require("../backend/engine/paths.mts");

const ROOT = path.join(__dirname, "..");
const REGRESSION_DIR = path.join(SCENARIOS_DIR, "regression");

const M3_IDS = ["priya_biweekly_qspec", "lin_biweekly_thread", "ahmed_growth_delta"];

function getExpectedBaseline(dim, id) {
  const table = {
    priya_biweekly_qspec: { question_specificity: 0, plan_thread_follow: 0, plan_delta_accuracy: 0.5 },
    lin_biweekly_thread: { question_specificity: 0, plan_thread_follow: 0, plan_delta_accuracy: 0.556 },
    ahmed_growth_delta: { question_specificity: 0.333, plan_thread_follow: 0, plan_delta_accuracy: 0.444 },
  };
  return table[id]?.[dim];
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ok(label, cond) {
  if (cond) {
    console.log(`  PASS  ${label}`);
    return 0;
  }
  console.error(`  FAIL  ${label}`);
  return 1;
}

function personaTerms(scenario) {
  const terms = new Set();
  const addWords = (text) => {
    for (const w of String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
      if (w.length >= 4) terms.add(w);
    }
  };
  const prep = scenario.prep || {};
  if (prep.name) terms.add(prep.name.toLowerCase());
  addWords(prep.role);
  addWords(prep.notes);
  for (const kw of ["backend", "engineer", "product", "api", "partner"]) {
    const blob = `${prep.role || ""} ${prep.notes || ""}`.toLowerCase();
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
  return a.split(/\s+/).filter(Boolean).length <= 3;
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
  return words.filter((w) => q.includes(w)).length >= 1;
}

function buildProxyTranscript(scenario) {
  const answers = scenario.prep?.answers || [];
  const bank = scenario.may24Bank || [];
  return bank.map((q, i) => ({
    turn: i + 1,
    question: {
      alias: q.alias,
      name: q.name,
      source: i === 0 ? "generated" : "planner_added",
      stage: q.stage || null,
    },
    answer: answers[Math.min(i, answers.length - 1)] || "",
    skipped: false,
    realized_deltas: {},
  }));
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

function runReplayFixtures(id) {
  const res = spawnSync(process.execPath, [path.join(ROOT, "scripts/replay-scenario.js"), id, "--fixtures-only"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    console.error(res.stdout || "");
    console.error(res.stderr || "");
  }
  return res.status === 0;
}

function checkScenario(scenario) {
  console.log(`\n--- ${scenario.id} (${scenario.may24?.run_id}) ---`);
  let failed = 0;

  failed += ok("has may24 baseline", scenario.may24?.baseline != null);
  failed += ok("has may24 bank snapshot", Array.isArray(scenario.may24Bank) && scenario.may24Bank.length > 0);
  failed += ok("has prep answers for proxy", (scenario.prep?.answers || []).length >= 5);

  const baseline = scenario.may24.baseline;
  const target = scenario.may24.targetDimension;
  failed += ok(`baseline ${target} documented`, typeof baseline[target] === "number");
  failed += ok(`baseline ${target} matches May-24 pin`, Math.abs(baseline[target] - getExpectedBaseline(target, scenario.id)) < 0.001);

  const may24Qspec = scoreQuestionSpecificity(scenario.may24Bank, scenario);
  if (target === "question_specificity") {
    failed += ok(`may24 baseline qspec is 0 (pinned)`, baseline.question_specificity === 0);
  }

  const proxy = buildProxyTranscript(scenario);
  const thread = scoreThreadFollow(proxy);
  const delta = scoreDeltaAccuracy(proxy);

  if (target === "plan_thread_follow") {
    failed += ok(`may24 baseline thread is 0 (pinned)`, baseline.plan_thread_follow === 0);
  }
  if (target === "plan_delta_accuracy") {
    failed += ok(`may24 baseline delta is 0.444 (pinned)`, Math.abs(baseline.plan_delta_accuracy - 0.444) < 0.01);
    failed += ok(`may24 proxy delta low (${delta.evidence})`, delta.score <= 0.5);
  }

  failed += ok("replay fixtures pass", runReplayFixtures(scenario.id));

  return {
    failed,
    scenario: scenario.id,
    run_id: scenario.may24.run_id,
    targetDimension: target,
    baseline,
    may24BankQspec: may24Qspec.score,
    proxyThread: thread.score,
    proxyDelta: delta.score,
    floors: scenario.may24.floors,
  };
}

async function runLivePrep(scenario) {
  if (!process.env.OPENAI_API_KEY) {
    console.log("  SKIP  live prep — OPENAI_API_KEY not set");
    return null;
  }
  const res = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts/replay-scenario.js"), scenario.id],
    { cwd: ROOT, encoding: "utf8", env: process.env }
  );
  if (res.status !== 0) {
    console.error(res.stdout || res.stderr || "live prep failed");
    return { ok: false };
  }
  console.log(`  PASS  live prep for ${scenario.id}`);
  return { ok: true };
}

async function main() {
  const live = process.argv.includes("--live");
  console.log("\nBatch M3 — May-24 regression fixtures\n");

  const results = [];
  let failed = 0;

  for (const id of M3_IDS) {
    const file = path.join(REGRESSION_DIR, `${id}.json`);
    if (!fs.existsSync(file)) {
      console.error(`  FAIL  missing fixture: ${file}`);
      failed += 1;
      continue;
    }
    const scenario = loadJson(file);
    const r = checkScenario(scenario);
    failed += r.failed;
    results.push(r);
    if (live) await runLivePrep(scenario);
  }

  const reportPath = path.join(ROOT, "logs/may/2026_May24_batch/m3-regression-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), fixtures: M3_IDS, results }, null, 2) + "\n"
  );
  console.log(`\nReport: ${reportPath}`);

  if (failed) {
    console.error(`\n${failed} check(s) FAILED\n`);
    process.exit(1);
  }
  console.log("\nAll Batch M3 checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
