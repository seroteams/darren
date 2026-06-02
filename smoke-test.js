#!/usr/bin/env node
//
// Sero end-to-end smoke test.
//
// Spawns `node cli.js` as a child process, pipes pre-canned answers from a
// scenario file through stdin, walks the full 5-stage flow, then verifies
// the session log on disk.
//
// Run: node smoke-test.js [scenarios/001-senior-backend-weekly.json]
//
// What this verifies:
//   - Stage 1 focus points generated and logged
//   - Stage 2 intro questions loaded from questions/_intro/<slug>/
//   - Stage 3 dynamic question bank generated (or falls back to _seed)
//   - Stage 4 per-turn planner scores answers + adjusts queue
//   - Stage 5 final evaluation returns a JSON briefing with all required keys
//   - transcript.json and axis-state.json are written at session root
//
// What this does NOT verify:
//   - That the questions or final briefing are *good* — that's a judgement call
//   - Visual rendering (stdout is captured, you won't see colours live)
//   - Behaviour under API failure (scenarios assume happy path)

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { loadEnv } = require("./src/env");
const { MEETING_TYPES } = require("./src/meeting-types");
const { allResolved } = require("./src/models");
const { TOTAL_BUDGET, INTRO_BUDGET, DYNAMIC_BUDGET } = require("./src/budgets");
const { monthFolderFor } = require("./src/session");
const { stringifyYaml, parseYaml } = require("./src/questions");

loadEnv();

// ---------------------------------------------------------------- Unit checks
// These run before any API calls. Failures exit immediately.
function unitChecks() {
  const checks = [];
  const pass = (label) => checks.push({ ok: true, label });
  const fail = (label, detail) => checks.push({ ok: false, label, detail });

  // 1. YAML round-trip with special characters
  const testQ = {
    alias: "q_roundtrip_test",
    label: 'Test "quoted" label',
    name: 'Question with \\ backslash and " quote: edge case',
    description: "Colon in description: fine",
    purpose: "wellbeing",
    axis_effects: { wellbeing: 1, engagement: -1 },
    source: "test",
  };
  try {
    const yaml = stringifyYaml(testQ);
    const parsed = parseYaml(yaml);
    if (parsed.label === testQ.label) pass("YAML round-trip: quoted label");
    else fail("YAML round-trip: quoted label", `got "${parsed.label}"`);
    if (parsed.name === testQ.name) pass("YAML round-trip: backslash + quote in name");
    else fail("YAML round-trip: backslash + quote in name", `got "${parsed.name}"`);
    if (parsed.axis_effects?.wellbeing === 1 && parsed.axis_effects?.engagement === -1)
      pass("YAML round-trip: axis_effects preserved");
    else fail("YAML round-trip: axis_effects", `got ${JSON.stringify(parsed.axis_effects)}`);
  } catch (e) {
    fail("YAML round-trip", e.message);
  }

  // 2. Budget constant consistency
  if (TOTAL_BUDGET === INTRO_BUDGET + DYNAMIC_BUDGET)
    pass(`budget constants consistent: ${INTRO_BUDGET} + ${DYNAMIC_BUDGET} = ${TOTAL_BUDGET}`);
  else fail("budget constants consistent", `TOTAL_BUDGET ${TOTAL_BUDGET} ≠ ${INTRO_BUDGET} + ${DYNAMIC_BUDGET}`);

  // 3. Prompt placeholder coverage — every {{X}} in a prompt file has a .replace call in its src file
  const PROMPT_SRC_MAP = {
    "prompts/generate-focus-points.md": "src/generate.js",
    "prompts/generate-questions.md":    "src/question-generator.js",
    "prompts/plan-turn.md":             "src/queue-manager.js",
    "prompts/preparation.md":           "src/preparation.js",
    "prompts/final-evaluation.md":      "src/reviewer.js",
  };
  for (const [promptFile, srcFile] of Object.entries(PROMPT_SRC_MAP)) {
    try {
      const promptText = fs.readFileSync(promptFile, "utf8");
      const srcText = fs.readFileSync(srcFile, "utf8");
      const placeholders = [...promptText.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]);
      const unique = [...new Set(placeholders)];
      const missing = unique.filter((p) => !srcText.includes(`"{{${p}}}"`) && !srcText.includes(`\\{\\{${p}\\}\\}`));
      if (missing.length === 0) pass(`prompt placeholders covered: ${path.basename(promptFile)}`);
      else fail(`prompt placeholders covered: ${path.basename(promptFile)}`, `missing .replace for: ${missing.join(", ")}`);
    } catch (e) {
      fail(`prompt placeholder check: ${promptFile}`, e.message);
    }
  }

  const UNRESOLVED_PLACEHOLDER_RE = /\{\{[A-Z][A-Z0-9_]*\}\}/g;
  const { parseAIJson, assertNoUnresolvedPlaceholders } = require("./src/ai-client");
  const { buildMessages } = require("./src/preparation");

  // 4. A2 — parseAIJson rejects unresolved placeholders in model output
  try {
    parseAIJson('{"coreIssue":"Discuss {{NAME}} needs"}', "Test", []);
    fail("parseAIJson rejects unresolved placeholders");
  } catch (e) {
    if (e.message.includes("coreIssue") && e.message.includes("{{NAME}}"))
      pass("parseAIJson rejects unresolved placeholders");
    else fail("parseAIJson rejects unresolved placeholders", e.message);
  }

  // 5. A3 — send-time guard lists token name
  try {
    assertNoUnresolvedPlaceholders("still {{FOO}} here", "test");
    fail("assertNoUnresolvedPlaceholders rejects leaks");
  } catch (e) {
    if (e.message.includes("{{FOO}}"))
      pass("assertNoUnresolvedPlaceholders rejects leaks");
    else fail("assertNoUnresolvedPlaceholders rejects leaks", e.message);
  }

  // 6. Prep validator — C1/C5 fixtures (offline)
  const { validateBrief } = require("./src/preparation");
  try {
    const tobyInputs = {
      name: "Toby",
      roleTitle: "Expert UX Designer",
      seniority: "Expert",
      meetingType: "Growth & career plan",
      observedShift: "He wants to become a lead but his communication methods suck",
      focusPoints: [{ label: "Communication effectiveness for a future lead role." }],
    };
    const bad = validateBrief(
      {
        openingQuestion:
          "What specific communication challenges have you faced recently that might impact your transition to a lead role?",
        listenFor: ["whether he acknowledges communication challenges"],
        goodOutcome: "You and Toby have agreed on one specific communication skill to focus on improving this quarter.",
        suggestedAction: "Set a follow-up meeting in one month to review progress.",
        coreIssue: "Communication for lead.",
        avoid: ["do not x", "do not y"],
      },
      tobyInputs
    );
    if (bad.issues.length >= 3) pass("prep validator flags historical bad Toby brief");
    else fail("prep validator flags historical bad Toby brief", `got ${bad.issues.length} issues`);
  } catch (e) {
    fail("prep validator flags historical bad Toby brief", e.message);
  }

  // 8. Toby prep — all {{TOKEN}} substituted before send
  try {
    const tobyInputsPath = path.join(
      "logs",
      "may",
      "2026_May24_21-46-1eb839fd",
      "01b-preparation",
      "inputs.json"
    );
    const toby = JSON.parse(fs.readFileSync(tobyInputsPath, "utf8"));
    const messages = buildMessages({
      name: toby.name,
      roleTitle: toby.roleTitle,
      seniority: toby.seniority,
      meetingType: toby.meetingType,
      observedShift: toby.observedShift,
      focusPoints: toby.focusPoints,
    });
    const combined = [messages.filled, messages.system, messages.user].join("\n");
    const leaks = combined.match(UNRESOLVED_PLACEHOLDER_RE);
    if (leaks && leaks.length)
      fail("Toby prep prompt substitution", `unresolved: ${[...new Set(leaks)].join(", ")}`);
    else pass("Toby prep prompt substitution");
  } catch (e) {
    fail("Toby prep prompt substitution", e.message);
  }

  const failed = checks.filter((c) => !c.ok);
  const banner = (s) => `\n━━━ ${s} ${"━".repeat(Math.max(3, 60 - s.length))}`;
  console.log(banner("unit checks"));
  for (const c of checks) {
    console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.label}${c.detail ? "  —  " + c.detail : ""}`);
  }
  if (failed.length > 0) {
    console.log(`\n  ${failed.length} unit check(s) failed — fix before running E2E\n`);
    process.exit(1);
  }
  console.log(`\n  ${checks.length}/${checks.length} passed\n`);
}

const scenarioPath = process.argv[2] || "scenarios/001-senior-backend-weekly.json";
const scenarioAbs = path.resolve(scenarioPath);

if (!fs.existsSync(scenarioAbs)) {
  console.error(`Scenario not found: ${scenarioPath}`);
  process.exit(2);
}

const scenario = JSON.parse(fs.readFileSync(scenarioAbs, "utf8"));
const meetingIdx = MEETING_TYPES.findIndex((m) => m.label === scenario.meeting_type);
if (meetingIdx < 0) {
  console.error(`Unknown meeting_type in scenario: ${scenario.meeting_type}`);
  process.exit(2);
}

const answers = scenario.answers || [];
const BUDGET = TOTAL_BUDGET;
const substantiveAnswers = answers.filter((a) => {
  const t = String(a || "").trim();
  return t && t !== "(skipped)";
});
if (substantiveAnswers.length < BUDGET) {
  console.error(
    `Scenario ${scenarioPath} has ${substantiveAnswers.length} substantive answer(s) but TOTAL_BUDGET is ${BUDGET}. Add ${BUDGET - substantiveAnswers.length} more.`
  );
  process.exit(2);
}
const inputs = [
  "n", // Recent-runs start menu: new run
  scenario.name,
  scenario.role,
  scenario.seniority,
  String(meetingIdx + 1),
  (scenario.manager_notes || "").replace(/\s*\n\s*/g, " ").trim(),
  "y", // Continue?
  ...answers,
];
// Pad with skips so the pipe never runs dry mid-session.
// +10 covers post-eval prompts: lexicon review (1) + rating prompts (≤3) + headroom.
while (inputs.length < 7 + BUDGET + 10) inputs.push("");

// -------------------------------------------------------------- Expectations
unitChecks();

const models = allResolved();
const banner = (s) => `\n━━━ ${s} ${"━".repeat(Math.max(3, 60 - s.length))}`;

console.log(banner("Sero smoke test"));
console.log(`  scenario:   ${scenarioPath}`);
console.log(`  persona:    ${scenario.name} · ${scenario.role} · ${scenario.seniority}`);
console.log(`  meeting:    ${scenario.meeting_type}`);
console.log(`  models:     (from config/models.json)`);
console.log(`    focus-points   ${models.focus_points}`);
console.log(`    bank           ${models.bank}`);
console.log(`    planner        ${models.planner}  (×${BUDGET} calls)`);
console.log(`    evaluation     ${models.evaluation}`);
console.log(`  answers:    ${answers.length} prepared (budget is ${BUDGET})`);
console.log(`  API calls:  ~${2 + BUDGET + 1} to OpenAI`);
console.log(`  est time:   45–120s`);
console.log(banner("live output"));

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not set in env or .env. Cannot run smoke test.");
  process.exit(2);
}

// ------------------------------------------------------------------- Spawn
// Sessions live at logs/<month>/<id>/. Walk two levels so we can detect a
// freshly-created session regardless of which month folder it lands in.
function scanSessions() {
  if (!fs.existsSync("logs")) return [];
  const out = [];
  for (const month of fs.readdirSync("logs")) {
    const monthDir = path.join("logs", month);
    let entries;
    try { entries = fs.readdirSync(monthDir); } catch { continue; }
    for (const id of entries) out.push(path.join(month, id));
  }
  return out;
}

const SESSION_ID_RE = /session (\d{4}_[A-Z][a-z]{2}\d{2}_\d{2}-\d{2}-[a-f0-9]{8})/;

function resolveNewSession(stdout, logsBefore) {
  const idMatch = stdout.match(SESSION_ID_RE);
  if (idMatch) {
    const month = monthFolderFor(idMatch[1]);
    if (month) {
      const rel = path.join(month, idMatch[1]);
      if (fs.existsSync(path.join("logs", rel))) return rel;
    }
  }
  const newSessions = scanSessions().filter((d) => !logsBefore.has(d));
  const completed = newSessions
    .filter((rel) => fs.existsSync(path.join("logs", rel, "transcript.json")))
    .sort();
  if (completed.length) return completed[completed.length - 1];
  return newSessions.sort()[newSessions.length - 1] || null;
}

const logsBefore = new Set(scanSessions());
const startedAt = Date.now();

const child = spawn(process.execPath, ["cli.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, NO_COLOR: "1" }, // cleaner test output
});

// Pipe each answer on its own line. readline in cli.js consumes lines one at
// a time as rl.question() fires; buffering the whole script up front is fine.
child.stdin.write(inputs.join("\n") + "\n");
child.stdin.end();

// Tee stdout so we see the flow as it runs but can also buffer for later.
const stdoutChunks = [];
child.stdout.on("data", (chunk) => {
  stdoutChunks.push(chunk);
  process.stdout.write(chunk);
});

child.on("exit", (code) => {
  const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(banner(`child exited (code ${code}, ${duration}s)`));
  const stdout = Buffer.concat(stdoutChunks).toString();
  verify(code, stdout).then((ok) => process.exit(ok ? 0 : 1));
});

// ---------------------------------------------------------------- Verify
async function verify(exitCode, stdout) {
  const checks = [];
  const pass = (label) => checks.push({ ok: true, label });
  const fail = (label, detail) => checks.push({ ok: false, label, detail });

  if (exitCode === 0) pass("child exited 0");
  else fail("child exited 0", `got code ${exitCode}`);

  const session = resolveNewSession(stdout, logsBefore);
  if (!session) {
    fail("new session directory created", "no new dir in logs/");
    return report(checks);
  }
  pass(`new session directory: logs/${session}/`);

  const sDir = path.join("logs", session);
  const must = {
    "01-focus-points/response.json": "stage 1 response logged",
    "01b-preparation/response.json": "stage 1b preparation response logged",
    "01b-preparation/inputs.json": "stage 1b preparation inputs logged",
    "02-intro-questions/aliases.json": "stage 2 intro aliases logged",
    "03-question-bank/response.json": "stage 3 bank response logged",
    "04-dynamic-answers": "stage 4 per-turn directory",
    "05-evaluation/response.json": "stage 5 evaluation response logged",
    "transcript.json": "transcript.json present",
    "axis-state.json": "axis-state.json present",
    "pipeline-lock.json": "pipeline-lock.json present",
  };
  for (const [rel, label] of Object.entries(must)) {
    const p = path.join(sDir, rel);
    if (fs.existsSync(p)) pass(label);
    else fail(label, `missing ${p}`);
  }

  // Preparation stage shape — retry harness + required response keys
  try {
    const prepInputs = JSON.parse(fs.readFileSync(path.join(sDir, "01b-preparation/inputs.json"), "utf8"));
    if (typeof prepInputs.attempts === "number" && prepInputs.attempts >= 1) {
      pass(`preparation retry harness wired (attempts=${prepInputs.attempts})`);
    } else {
      fail("preparation inputs.json has attempts field", `got ${JSON.stringify(prepInputs.attempts)}`);
    }
  } catch (e) {
    fail("preparation inputs.json parses", e.message);
  }

  try {
    const prepResp = JSON.parse(fs.readFileSync(path.join(sDir, "01b-preparation/response.json"), "utf8"));
    const prepRequired = ["coreIssue", "openingQuestion", "listenFor", "avoid", "goodOutcome", "suggestedAction"];
    const prepMissing = prepRequired.filter((k) => !(k in prepResp));
    if (prepMissing.length === 0) pass("preparation response JSON has all required keys");
    else fail("preparation response JSON has all required keys", `missing: ${prepMissing.join(", ")}`);
  } catch (e) {
    fail("01b-preparation/response.json parses", e.message);
  }

  // Transcript has turns
  try {
    const transcript = JSON.parse(fs.readFileSync(path.join(sDir, "transcript.json"), "utf8"));
    if (Array.isArray(transcript) && transcript.length >= 1) {
      pass(`transcript has ${transcript.length} turns`);
      const withDeltas = transcript.filter((t) => t.realized_deltas && Object.keys(t.realized_deltas).length > 0);
      if (withDeltas.length >= 1) pass(`${withDeltas.length} turns scored axis deltas`);
      else fail("at least one turn produced axis deltas", `0 of ${transcript.length} turns had deltas`);
    } else {
      fail("transcript has >=1 turn", `got ${JSON.stringify(transcript).slice(0, 120)}`);
    }
  } catch (e) {
    fail("transcript.json parses", e.message);
  }

  // Axis state
  try {
    const axes = JSON.parse(fs.readFileSync(path.join(sDir, "axis-state.json"), "utf8"));
    const keys = Object.keys(axes);
    const expected = ["wellbeing", "engagement", "clarity", "growth"];
    if (expected.every((k) => keys.includes(k))) pass("axis-state has all 4 axes");
    else fail("axis-state has all 4 axes", `got keys: ${keys.join(", ")}`);
  } catch (e) {
    fail("axis-state.json parses", e.message);
  }

  // Final evaluation shape
  try {
    const evalRaw = fs.readFileSync(path.join(sDir, "05-evaluation/response.json"), "utf8");
    const evalJson = JSON.parse(evalRaw);
    const required = [
      "summary_bullets",
      "understanding_paragraph",
      "axes",
      "brutal_truth_employee",
      "brutal_truth_manager",
    ];
    const missing = required.filter((k) => !(k in evalJson));
    if (missing.length === 0) pass("final evaluation JSON has all required keys");
    else fail("final evaluation JSON has all required keys", `missing: ${missing.join(", ")}`);

    if (Array.isArray(evalJson.axes) && evalJson.axes.length === 4) pass("final evaluation has 4 axes");
    else fail("final evaluation has 4 axes", `got ${evalJson.axes?.length ?? "?"}`);

    if (Array.isArray(evalJson.summary_bullets) && evalJson.summary_bullets.length >= 3) {
      pass(`summary_bullets count ${evalJson.summary_bullets.length}`);
    } else {
      fail("summary_bullets >= 3", `got ${evalJson.summary_bullets?.length ?? "?"}`);
    }
  } catch (e) {
    fail("05-evaluation/response.json parses", e.message);
  }

  // Generated questions written to disk
  const generatedCount = fs.existsSync("questions")
    ? fs.readdirSync("questions").filter((f) => f.endsWith(".yaml")).length
    : 0;
  if (generatedCount > 0) pass(`${generatedCount} generated question YAML(s) on disk`);
  else fail("generated question YAMLs", "questions/ has no generated .yaml files");

  // Cost log
  try {
    const costLog = JSON.parse(fs.readFileSync(path.join(sDir, "cost.json"), "utf8"));
    if (typeof costLog.usd_total === "number" && costLog.call_count > 0) {
      pass(`cost tracked: ${costLog.call_count} calls, $${costLog.usd_total.toFixed(4)}, ${costLog.total_tokens} tokens`);
    } else {
      fail("cost.json has totals", `got ${JSON.stringify(costLog).slice(0, 120)}`);
    }
  } catch (e) {
    fail("cost.json parses", e.message);
  }

  return report(checks);
}

function report(checks) {
  console.log(banner("verification"));
  let failed = 0;
  for (const c of checks) {
    if (c.ok) console.log(`  PASS  ${c.label}`);
    else {
      failed += 1;
      console.log(`  FAIL  ${c.label}${c.detail ? "  —  " + c.detail : ""}`);
    }
  }
  console.log();
  console.log(failed === 0 ? `  ${checks.length}/${checks.length} passed` : `  ${checks.length - failed}/${checks.length} passed, ${failed} failed`);
  console.log();
  return failed === 0;
}
