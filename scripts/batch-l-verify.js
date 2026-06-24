#!/usr/bin/env node
// Batch L — lexicon pipeline verification (G1–G5, LF-1 prompt wiring).
// Offline: node scripts/batch-l-verify.js
// Live:    node scripts/batch-l-verify.js --live  (needs OPENAI_API_KEY)

const fs = require("node:fs");
const path = require("node:path");
const { loadEnv } = require("../backend/engine/env.ts");
const { CONTENT_DIR, SCENARIOS_DIR, LEXICONS_DIR } = require("../backend/engine/paths.mts");

loadEnv();

const ROOT = path.join(__dirname, "..");
const SCENARIO_PATH = path.join(SCENARIOS_DIR, "regression/toby_lexicon_growth.json");

const PROMPT_HUNKS = [
  {
    id: "transcript-speakers-g1",
    file: "prompts/review-session-for-lexicon.md",
    needles: ["manager_question", "employee_answer", "Treat `employee_answer`"],
  },
  {
    id: "quality-floor-g4",
    file: "prompts/review-session-for-lexicon.md",
    needles: ["Quality floor (no filler)", "Never pad with generic business vocabulary"],
  },
  {
    id: "lf1-eval-hook",
    file: "backend/api/handlers/evaluation.js",
    needles: ["kickLexiconReview", "generateSuggestions"],
  },
];

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

function checkPromptHunks() {
  console.log("\n--- Prompt + wiring hunks ---");
  let failed = 0;
  for (const hunk of PROMPT_HUNKS) {
    const base = hunk.file.startsWith("prompts/") ? CONTENT_DIR : ROOT;
    const text = fs.readFileSync(path.join(base, hunk.file), "utf8");
    for (const needle of hunk.needles) {
      failed += ok(`${hunk.id}: ${needle.slice(0, 48)}`, text.includes(needle));
    }
  }
  return failed;
}

function checkScopeAndPrompt(scenario) {
  console.log("\n--- Scope + prompt build (G1/G2/G3) ---");
  let failed = 0;
  const {
    shouldReview,
    buildPrompt,
    normalizeTranscriptForReview,
    extractBankQuestions,
  } = require("../backend/engine/lexicon-reviewer");
  const { resolveLexiconScope } = require("../backend/engine/lexicon");
  const { loadLexicon } = require("../backend/engine/lexicon");

  const ctx = scenario.ctx;
  failed += ok("Toby growth → shouldReview", shouldReview(ctx) === scenario.expect.shouldReview);

  const scope = resolveLexiconScope(ctx);
  failed += ok(`expert maps to file seniority ${scenario.expect.fileSeniority}`, scope.seniority === scenario.expect.fileSeniority);

  failed += ok("Carl bi-weekly → skipped", !shouldReview({
    role: "UX Lead",
    seniority: "Lead",
    meetingType: "Bi-weekly check-in",
  }));

  const sessionDir = path.join(ROOT, scenario.sessionDir);
  const transcript = loadJson(path.join(sessionDir, "transcript.json"));
  const bankResp = loadJson(path.join(sessionDir, "03-question-bank", "response.json"));
  const evalResp = loadJson(path.join(sessionDir, "05-evaluation", "response.json"));
  const bank = extractBankQuestions(bankResp);
  const lexicon = loadLexicon({ meetingType: ctx.meetingType, role: ctx.role, seniority: "Lead" });

  failed += ok(`transcript turns >= ${scenario.expect.transcriptTurnsMin}`, transcript.length >= scenario.expect.transcriptTurnsMin);

  const normalized = normalizeTranscriptForReview(transcript);
  failed += ok("normalized transcript has manager_question + employee_answer", normalized.every((t) => "manager_question" in t && "employee_answer" in t));

  const messages = buildPrompt({ scope, ctx, lexicon, transcript, bank, evaluation: evalResp });
  const blob = `${messages.system}\n${messages.user}`;
  for (const sub of scenario.expect.promptContains) {
    failed += ok(`prompt contains "${sub}"`, blob.includes(sub));
  }

  return failed;
}

function checkSparseFixture(scenario) {
  console.log("\n--- Sparse transcript (no padding) ---");
  let failed = 0;
  const { buildPrompt, normalizeTranscriptForReview } = require("../backend/engine/lexicon-reviewer");
  const { resolveLexiconScope } = require("../backend/engine/lexicon");
  const { loadLexicon } = require("../backend/engine/lexicon");

  const ctx = scenario.ctx;
  const scope = resolveLexiconScope(ctx);
  const lexicon = loadLexicon({ meetingType: ctx.meetingType, role: ctx.role, seniority: "Lead" });
  const sparse = scenario.sparse;
  const normalized = normalizeTranscriptForReview(sparse.transcript);
  failed += ok("sparse transcript is shallow", normalized.every((t) => t.shallow || t.employee_answer.length < 8));

  const messages = buildPrompt({
    scope,
    ctx,
    lexicon,
    transcript: sparse.transcript,
    bank: [],
    evaluation: sparse.evaluation,
  });
  failed += ok("sparse prompt mentions quality floor", messages.system.includes("Quality floor"));

  return failed;
}

async function checkLive(scenario) {
  console.log("\n--- Live reviewer (optional) ---");
  if (!process.env.OPENAI_API_KEY) {
    console.log("  SKIP  OPENAI_API_KEY not set");
    return 0;
  }
  let failed = 0;
  const { generateSuggestions } = require("../backend/engine/lexicon-reviewer");
  const sessionDir = path.join(ROOT, scenario.sessionDir);
  const sessionId = path.basename(sessionDir);
  const tracePath = path.join(LEXICONS_DIR, "_suggested", `${sessionId}.json`);
  const hadTrace = fs.existsSync(tracePath);
  const traceBackup = hadTrace ? fs.readFileSync(tracePath, "utf8") : null;
  if (hadTrace) fs.unlinkSync(tracePath);

  try {
    const result = await generateSuggestions({
      session: { id: sessionId, dir: sessionDir },
      ctx: scenario.ctx,
      force: true,
    });
    failed += ok("live run not skipped", !result.skipped);
    const count = (result.suggestions || []).length;
    failed += ok(`live suggestions >= ${scenario.expect.liveSuggestionMin}`, count >= scenario.expect.liveSuggestionMin);
    const joined = (result.suggestions || []).map((s) => `${s.value} ${s.reason}`).join(" ").toLowerCase();
    const hit = scenario.expect.liveValueSubstrings.some((sub) => joined.includes(sub.toLowerCase()));
    failed += ok("live suggestions mention growth-domain vocabulary", hit);
    console.log(`  info  ${count} suggestion(s): ${(result.suggestions || []).map((s) => s.value).join("; ")}`);
  } finally {
    if (hadTrace && traceBackup) fs.writeFileSync(tracePath, traceBackup);
    else if (fs.existsSync(tracePath)) fs.unlinkSync(tracePath);
  }
  return failed;
}

async function main() {
  const live = process.argv.includes("--live");
  const scenario = loadJson(SCENARIO_PATH);
  let failed = 0;
  failed += checkPromptHunks();
  failed += checkScopeAndPrompt(scenario);
  failed += checkSparseFixture(scenario);
  if (live) failed += await checkLive(scenario);

  console.log();
  if (failed) {
    console.error(`${failed} check(s) FAILED`);
    process.exit(1);
  }
  console.log("All Batch L checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
