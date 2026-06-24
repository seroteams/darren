#!/usr/bin/env node
// Replay a regression scenario — prep stage + validator assertions.
// Run: node scripts/replay-scenario.js toby_growth_lead
//      node scripts/replay-scenario.js toby_growth_lead --fixtures-only  (no API)
//      node scripts/replay-scenario.js toby_growth_lead --check-transcript <path>  (offline arc checks)
//      node scripts/replay-scenario.js priya-biweekly-checkin --fixtures-only  (batch persona)
//      node scripts/replay-scenario.js --list
//      node scripts/replay-scenario.js --batch-all --fixtures-only
//      node scripts/replay-scenario.js --regression-all --fixtures-only

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const { loadEnv } = require("../backend/engine/env");
loadEnv();

const { MEETING_TYPES } = require("../backend/engine/meeting-types.ts");
const { TOTAL_BUDGET } = require("../backend/engine/budgets.ts");
const { validateBrief, generatePreparation } = require("../backend/engine/preparation");
const { resolveSelectedFocus } = require("../backend/engine/selected-focus.ts");
const {
  runGoldenScenarioChecks,
  runQualityPrepListenFor,
} = require("../backend/engine/golden-checks");

const { SCENARIOS_DIR } = require("../backend/engine/paths");
const REGRESSION_DIR = path.join(SCENARIOS_DIR, "regression");
const BATCH_DIR = path.join(SCENARIOS_DIR, "batch");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function resolveScenarioPath(id) {
  const raw = String(id || "").trim();
  if (!raw) return null;

  const withJson = raw.endsWith(".json") ? raw : `${raw}.json`;
  const base = withJson.replace(/\.json$/, "");

  const candidates = [];
  if (path.isAbsolute(raw) && fs.existsSync(raw)) candidates.push(raw);
  if (raw.startsWith("batch/")) {
    candidates.push(path.join(BATCH_DIR, raw.slice("batch/".length).replace(/\.json$/, "") + ".json"));
  }
  candidates.push(
    path.join(REGRESSION_DIR, `${base}.json`),
    path.join(BATCH_DIR, `${base}.json`),
    path.join(SCENARIOS_DIR, `${base}.json`),
    path.join(ROOT, withJson)
  );

  const seen = new Set();
  for (const file of candidates) {
    if (!file || seen.has(file)) continue;
    seen.add(file);
    if (fs.existsSync(file)) {
      let kind = "scenario";
      if (file.startsWith(REGRESSION_DIR + path.sep)) kind = "regression";
      else if (file.startsWith(BATCH_DIR + path.sep)) kind = "batch";
      return { path: file, kind, id: path.basename(file, ".json") };
    }
  }
  return null;
}

function isSmokeShape(data) {
  return Boolean(
    data?.name &&
    data?.meeting_type &&
    !data?.prep &&
    !data?.ctx &&
    !data?.fixtures &&
    !data?.expect &&
    !data?.sessionDir
  );
}

function normalizeScenario(data, meta) {
  if (data.prep) {
    return {
      ...data,
      id: data.id || meta.id,
      _kind: meta.kind,
      _path: meta.path,
    };
  }
  if (isSmokeShape(data)) {
    return {
      id: meta.id,
      description: `${data.name} · ${data.role} · ${data.meeting_type}`,
      prep: {
        name: data.name,
        role: data.role,
        seniority: data.seniority,
        meetingType: data.meeting_type,
        notes: data.manager_notes || "",
        focusPoints: data.focusPoints || [],
      },
      fixtures: [],
      _kind: meta.kind,
      _path: meta.path,
      _smoke: data,
    };
  }
  return {
    ...data,
    id: data.id || meta.id,
    _kind: meta.kind,
    _path: meta.path,
  };
}

function loadScenario(id) {
  const resolved = resolveScenarioPath(id);
  if (!resolved) {
    throw new Error(`Scenario not found: ${id}`);
  }
  const data = loadJson(resolved.path);
  return normalizeScenario(data, resolved);
}

function listScenarios() {
  const out = { regression: [], batch: [], scenario: [] };
  const regressionIndex = path.join(REGRESSION_DIR, "_index.json");
  if (fs.existsSync(regressionIndex)) {
    for (const id of loadJson(regressionIndex)) {
      out.regression.push({ id, path: path.relative(ROOT, path.join(REGRESSION_DIR, `${id}.json`)) });
    }
  }
  const batchIndex = path.join(BATCH_DIR, "_index.json");
  if (fs.existsSync(batchIndex)) {
    for (const entry of loadJson(batchIndex)) {
      out.batch.push({
        id: entry.file.replace(/\.json$/, ""),
        name: entry.name,
        meeting_type: entry.meeting_type,
        path: path.relative(ROOT, path.join(BATCH_DIR, entry.file)),
      });
    }
  }
  for (const file of fs.readdirSync(SCENARIOS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(SCENARIOS_DIR, file);
    out.scenario.push({ id: file.replace(/\.json$/, ""), path: path.relative(ROOT, full) });
  }
  return out;
}

function isSubstantiveAnswer(answer) {
  const a = String(answer || "").trim();
  if (!a) return false;
  return a.split(/\s+/).filter(Boolean).length > 3;
}

function runSmokeSchemaChecks(scenario) {
  const raw = scenario._smoke;
  if (!raw) return 0;
  let failed = 0;
  const label = scenario.id;

  const required = ["name", "role", "seniority", "meeting_type", "manager_notes", "answers"];
  for (const key of required) {
    if (raw[key] == null || (key !== "manager_notes" && raw[key] === "")) {
      console.error(`  FAIL  ${label} — missing required field: ${key}`);
      failed += 1;
    }
  }

  const meetingIdx = MEETING_TYPES.findIndex((m) => m.label === raw.meeting_type);
  if (meetingIdx < 0) {
    console.error(`  FAIL  ${label} — unknown meeting_type: ${raw.meeting_type}`);
    failed += 1;
  } else {
    console.log(`  PASS  ${label} — meeting_type resolves (${raw.meeting_type})`);
  }

  const answers = Array.isArray(raw.answers) ? raw.answers : [];
  const substantive = answers.filter(isSubstantiveAnswer).length;
  if (substantive < TOTAL_BUDGET) {
    console.error(
      `  FAIL  ${label} — ${substantive} substantive answer(s), need >= ${TOTAL_BUDGET} for smoke-test budget`
    );
    failed += 1;
  } else {
    console.log(`  PASS  ${label} — ${substantive} substantive answers (budget ${TOTAL_BUDGET})`);
  }

  if (typeof raw.manager_notes === "string" && raw.manager_notes.trim().length >= 20) {
    console.log(`  PASS  ${label} — manager_notes present`);
  } else {
    console.error(`  FAIL  ${label} — manager_notes too short or missing`);
    failed += 1;
  }

  return failed;
}

function prepInputs(scenario) {
  const p = scenario.prep;
  const focusPoints = p.focusPoints || [];
  const selectedFocus =
    p.selectedFocus ||
    resolveSelectedFocus({ notes: p.notes, observedShift: p.notes, focusPoints });
  return {
    name: p.name,
    roleTitle: p.role,
    seniority: p.seniority,
    meetingType: p.meetingType,
    observedShift: p.notes || "",
    focusPoints,
    selectedFocus,
    primaryFocusId: selectedFocus?.id,
  };
}

function runFixtureChecks(scenario) {
  const inputs = prepInputs(scenario);
  let failed = 0;
  for (const fx of scenario.fixtures || []) {
    const { issues } = validateBrief(fx.brief, inputs);
    const joined = issues.join(" ");
    let fxFailed = 0;
    for (const sub of fx.expectIssueSubstrings || []) {
      if (!joined.toLowerCase().includes(sub.toLowerCase())) {
        console.error(`  FAIL  fixture "${fx.label}" — expected issue containing: ${sub}`);
        console.error(`        got: ${issues.join("; ") || "(none)"}`);
        fxFailed += 1;
      }
    }
    if ((fx.expectIssueSubstrings || []).length === 0 && issues.length > 0) {
      console.error(`  FAIL  fixture "${fx.label}" — expected no issues, got: ${issues.join("; ")}`);
      fxFailed += 1;
    }
    if (fxFailed === 0) {
      console.log(`  PASS  fixture "${fx.label}" (${issues.length} validator note(s))`);
    } else {
      failed += fxFailed;
    }
  }
  return failed;
}

function checkField(label, text, rules) {
  const failures = [];
  const s = String(text || "");
  const lower = s.toLowerCase();
  for (const pat of rules.mustNotMatch || []) {
    if (new RegExp(pat, "i").test(s)) failures.push(`${label} matches banned pattern: ${pat}`);
  }
  for (const word of rules.mustNotContain || []) {
    if (lower.includes(word.toLowerCase())) failures.push(`${label} contains banned phrase: ${word}`);
  }
  if (rules.mustMatchAny?.length) {
    const ok = rules.mustMatchAny.some((pat) => new RegExp(pat, "i").test(s));
    if (!ok) failures.push(`${label} missing required pattern (one of: ${rules.mustMatchAny.join(", ")})`);
  }
  return failures;
}

function runTranscriptArcChecks(scenario, transcriptPath) {
  const expect = scenario.arc;
  if (!expect) {
    console.log("  (no `arc` block in scenario — skipping transcript checks)");
    return 0;
  }
  if (!fs.existsSync(transcriptPath)) {
    console.error(`  FAIL  transcript file not found: ${transcriptPath}`);
    return 1;
  }
  let transcript;
  try {
    transcript = loadJson(transcriptPath);
  } catch (e) {
    console.error(`  FAIL  transcript parse: ${e.message}`);
    return 1;
  }
  if (!Array.isArray(transcript)) {
    console.error(`  FAIL  transcript is not an array`);
    return 1;
  }
  let failed = 0;

  const stagesSeen = new Set(
    transcript.map((t) => t?.question?.stage).filter((s) => s)
  );
  for (const stage of expect.expectStages || []) {
    if (stagesSeen.has(stage)) {
      console.log(`  PASS  arc stage covered: ${stage}`);
    } else {
      console.error(`  FAIL  arc stage missing: ${stage}`);
      failed += 1;
    }
  }

  if (typeof expect.maxConsecutiveWellbeingClarifiers === "number") {
    const cap = expect.maxConsecutiveWellbeingClarifiers;
    let run = 0;
    let maxRun = 0;
    for (const t of transcript) {
      const q = t?.question;
      if (q?.source === "planner_added" && q.purpose === "wellbeing") {
        run += 1;
        if (run > maxRun) maxRun = run;
      } else {
        run = 0;
      }
    }
    if (maxRun <= cap) {
      console.log(`  PASS  consecutive wellbeing clarifiers <= ${cap} (max ${maxRun})`);
    } else {
      console.error(`  FAIL  consecutive wellbeing clarifiers exceeded cap ${cap} (saw ${maxRun})`);
      failed += 1;
    }
  }

  if (typeof expect.maxOffArcDrills === "number") {
    const cap = expect.maxOffArcDrills;
    const offArc = transcript.filter((t) => {
      const q = t?.question;
      return q?.source === "planner_added" && (q.stage === null || q.stage === undefined);
    }).length;
    if (offArc <= cap) {
      console.log(`  PASS  off-arc tangents <= ${cap} (saw ${offArc})`);
    } else {
      console.error(`  FAIL  off-arc tangents exceeded cap ${cap} (saw ${offArc})`);
      failed += 1;
    }
  }

  if (expect.closerStage) {
    if (stagesSeen.has(expect.closerStage)) {
      console.log(`  PASS  closer stage reached: ${expect.closerStage}`);
    } else {
      console.error(`  FAIL  closer stage never reached: ${expect.closerStage}`);
      failed += 1;
    }
  }

  return failed;
}

function runLiveChecks(brief, scenario) {
  const live = scenario.live || {};
  const failures = [];
  if (live.openingQuestion) {
    failures.push(...checkField("openingQuestion", brief.openingQuestion, live.openingQuestion));
  }
  if (live.goodOutcome) {
    failures.push(...checkField("goodOutcome", brief.goodOutcome, live.goodOutcome));
  }
  if (live.suggestedAction) {
    failures.push(...checkField("suggestedAction", brief.suggestedAction, live.suggestedAction));
  }
  if (live.listenFor?.eachMustMatchAny) {
    for (const item of brief.listenFor || []) {
      const ok = live.listenFor.eachMustMatchAny.some((pat) => new RegExp(pat, "i").test(String(item)));
      if (!ok) failures.push(`listenFor item missing behavioural cue: "${String(item).slice(0, 70)}…"`);
    }
  }
  return failures;
}

async function replayOne(id, { fixturesOnly, transcriptPath }) {
  const scenario = loadScenario(id);
  console.log(`\nReplay: ${scenario.id} — ${scenario.description || ""} [${scenario._kind}]\n`);

  let failed = 0;

  if (scenario._smoke) {
    console.log("─── Batch schema checks (offline) ───");
    failed += runSmokeSchemaChecks(scenario);
  }

  if ((scenario.fixtures || []).length > 0) {
    console.log("─── Validator fixtures (offline) ───");
    failed += runFixtureChecks(scenario);
  } else if (!scenario._smoke) {
    console.log("  (no prep fixtures — skipping validator fixtures)");
  }

  if (transcriptPath) {
    console.log("\n─── Transcript arc checks (offline) ───");
    failed += runTranscriptArcChecks(scenario, transcriptPath);
  }

  if (scenario.golden) {
    console.log("\n─── Golden regression checks (offline) ───");
    const { failures: gFails, passes: gPasses } = runGoldenScenarioChecks(scenario);
    for (const p of gPasses) console.log(`  PASS  ${p}`);
    for (const f of gFails) {
      console.error(`  FAIL  ${f}`);
      failed += 1;
    }
  }

  if (fixturesOnly) {
    if (failed > 0) {
      console.log(`\n${failed} check(s) failed.\n`);
      return 1;
    }
    console.log("\n✓ Offline checks passed (--fixtures-only, skipping live prep).\n");
    return 0;
  }

  if (!process.env.OPENAI_API_KEY) {
    if (failed > 0) {
      console.log(`\n${failed} check(s) failed.\n`);
      return 1;
    }
    console.warn("OPENAI_API_KEY not set — skipping live prep (offline checks passed).\n");
    return 0;
  }

  console.log("─── Live prep generation ───");
  const inputs = prepInputs(scenario);
  const { brief, validation } = await generatePreparation(inputs, { session: null });
  console.log("  openingQuestion:", brief.openingQuestion);
  console.log("  validator issues:", validation.issues.length ? validation.issues.join("; ") : "(none)");

  const liveFails = runLiveChecks(brief, scenario);
  const sf = inputs.selectedFocus;
  if (sf?.id === "quality") {
    for (const f of runQualityPrepListenFor(brief, sf)) {
      liveFails.push(f);
    }
  }
  if (liveFails.length) {
    liveFails.forEach((f) => console.error(`  FAIL  ${f}`));
    console.log();
    return 1;
  }

  if (failed > 0) {
    console.log(`\n${failed} offline check(s) failed.\n`);
    return 1;
  }

  console.log("\n✓ Live prep passed scenario assertions.\n");
  return 0;
}

async function replayBatchAll(fixturesOnly) {
  const indexPath = path.join(BATCH_DIR, "_index.json");
  if (!fs.existsSync(indexPath)) {
    console.error(`Batch index not found: ${indexPath}`);
    return 2;
  }
  const index = loadJson(indexPath);
  console.log(`\n─── Batch replay (${index.length} personas) ───\n`);
  let failed = 0;
  for (const entry of index) {
    const id = entry.file.replace(/\.json$/, "");
    const code = await replayOne(id, { fixturesOnly, transcriptPath: null });
    if (code !== 0) failed += 1;
  }
  if (failed) {
    console.error(`\n${failed} batch scenario(s) failed.\n`);
    return 1;
  }
  console.log(`\n✓ All ${index.length} batch scenarios passed offline checks.\n`);
  return 0;
}

async function replayRegressionAll(fixturesOnly) {
  const indexPath = path.join(REGRESSION_DIR, "_index.json");
  if (!fs.existsSync(indexPath)) {
    console.error(`Regression index not found: ${indexPath}`);
    return 2;
  }
  const ids = loadJson(indexPath);
  console.log(`\n─── Regression replay (${ids.length} fixtures) ───\n`);
  let failed = 0;
  for (const id of ids) {
    const code = await replayOne(id, { fixturesOnly, transcriptPath: null });
    if (code !== 0) failed += 1;
  }
  if (failed) {
    console.error(`\n${failed} regression fixture(s) failed.\n`);
    return 1;
  }
  console.log(`\n✓ All ${ids.length} regression fixtures passed.\n`);
  return 0;
}

function printList() {
  const lists = listScenarios();
  console.log("\nAvailable scenarios:\n");
  console.log("Regression:");
  for (const s of lists.regression) console.log(`  ${s.id}  (${s.path})`);
  console.log("\nBatch:");
  for (const s of lists.batch) console.log(`  ${s.id}  ${s.name} · ${s.meeting_type}`);
  console.log("\nRoot scenarios:");
  for (const s of lists.scenario) console.log(`  ${s.id}  (${s.path})`);
  console.log("\nExamples:");
  console.log("  node scripts/replay-scenario.js toby_growth_lead --fixtures-only");
  console.log("  node scripts/replay-scenario.js priya-biweekly-checkin --fixtures-only");
  console.log("  node scripts/replay-scenario.js --batch-all --fixtures-only");
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  const fixturesOnly = args.includes("--fixtures-only");
  const transcriptFlagIdx = args.indexOf("--check-transcript");
  const transcriptPath = transcriptFlagIdx >= 0 ? args[transcriptFlagIdx + 1] : null;

  if (args.includes("--list")) {
    printList();
    process.exit(0);
  }

  if (args.includes("--batch-all")) {
    process.exit(await replayBatchAll(fixturesOnly));
  }

  if (args.includes("--regression-all")) {
    process.exit(await replayRegressionAll(fixturesOnly));
  }

  const id = args.find((a, i) => {
    if (a.startsWith("--")) return false;
    if (transcriptFlagIdx >= 0 && i === transcriptFlagIdx + 1) return false;
    return true;
  });
  if (!id) {
    console.error(
      "Usage: node scripts/replay-scenario.js <scenario-id> [--fixtures-only] [--check-transcript <path>]\n" +
        "       node scripts/replay-scenario.js --list\n" +
        "       node scripts/replay-scenario.js --batch-all [--fixtures-only]\n" +
        "       node scripts/replay-scenario.js --regression-all [--fixtures-only]"
    );
    process.exit(2);
  }

  process.exit(await replayOne(id, { fixturesOnly, transcriptPath }));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
