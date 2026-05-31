#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("../src/env");
const { callAI, parseAIJson } = require("../src/ai-client");
const { getArc } = require("../src/one-on-one-types");
const { modelFor } = require("../src/models");

loadEnv();

const ROOT = path.join(__dirname, "..");
// Judge is the quality gate — use the strong tier (config/models.json "judge"),
// not a nano model. A weak judge produces harsh, low-signal verdicts.
const DEFAULT_MODEL = modelFor("judge");

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    pass: { type: "boolean" },
    score: { type: "integer", minimum: 1, maximum: 5 },
    arc_coverage: { type: "string" },
    tone_fit: { type: "string" },
    evidence: { type: "string" },
    flags: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["pass", "score", "arc_coverage", "tone_fit", "evidence", "flags"],
  additionalProperties: false,
};

function loadJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseBankQuestions(sessionDir) {
  const bankPath = path.join(sessionDir, "03-question-bank/response.json");
  const data = loadJson(bankPath, {});
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

function compactTranscript(transcript) {
  if (!Array.isArray(transcript)) return [];
  return transcript.map((turn, idx) => ({
    turn: idx + 1,
    question: turn?.question?.name || "",
    stage: turn?.question?.stage || "",
    answer: String(turn?.answer || "").slice(0, 500),
    skipped: Boolean(turn?.skipped),
  }));
}

function finalTurnSummary(transcript) {
  if (!Array.isArray(transcript) || !transcript.length) {
    return { has_final_turn: false, substantive: false, stage: "", answer: "" };
  }
  const last = transcript[transcript.length - 1];
  const answer = String(last?.answer || "").trim();
  const skipped = Boolean(last?.skipped) || !answer || answer === "(skipped)";
  const substantive = !skipped && answer.split(/\s+/).filter(Boolean).length >= 5;
  return {
    has_final_turn: true,
    substantive,
    skipped,
    stage: last?.question?.stage || "",
    question: last?.question?.name || "",
    answer: answer.slice(0, 500),
  };
}

// Tier is driven by the 1-5 score alone. Flags are informational context, NOT a
// blocking gate: the judge is instructed to always surface nits, so requiring
// zero flags to pass made passing mathematically impossible (0/15 in the first
// sweep). score>=4 = pass, 3 = watch, <3 = fail.
function computeVerdictTier({ score }) {
  if (score >= 4) return "pass";
  if (score === 3) return "watch";
  return "fail";
}

function stageCoverageSummary(arcStages, bankQuestions) {
  const expected = arcStages.map((s) => s.id);
  const seen = new Set(bankQuestions.map((q) => q.stage).filter(Boolean));
  const matched = expected.filter((id) => seen.has(id));
  return {
    expected_count: expected.length,
    matched_count: matched.length,
    missing_stage_ids: expected.filter((id) => !seen.has(id)),
    matched_stage_ids: matched,
  };
}

function buildMessages({ scenario, arcMeta, coverage, prepBrief, transcript, evaluation }) {
  const stageGuide = arcMeta.arc.map((stage) => ({
    id: stage.id,
    label: stage.label,
    intent: stage.intent,
    target_questions: stage.target_questions,
  }));

  const finalTurn = finalTurnSummary(transcript);

  const system = [
    "You are an experienced, fair QA judge for manager 1:1 simulation outputs.",
    "Score quality for this specific meeting type only.",
    "Use the meeting tone register, narrative arc, and anti-patterns as the rubric.",
    "Be concise and evidence-based.",
    "Use the full 1-5 scale calibrated as: 5 = excellent, fit-for-purpose; 4 = good, minor nits only; 3 = mixed, a real weakness; 2 = notably off-type or shallow; 1 = wrong type or broken.",
    "`flags` are informational nits for the reader — list them whenever useful. Do NOT lower the score merely because flags exist; a 4 or 5 session can still carry minor flags. Reserve a 2 for a genuine, substantive failure against the rubric, not for the absence of a dated deliverable in a conversation type that does not require one.",
    "Set the `pass` boolean to (score >= 4). It will be recomputed downstream regardless.",
    "Commitment/closer is satisfied when the final turn captures an employee-shaped next focus or support ask — not a manager-assigned homework deadline.",
    "Always evaluate the full transcript including the final/closer turn in final_turn_check.",
  ].join("\n");

  const userPayload = {
    persona: {
      name: scenario.name,
      role: scenario.role,
      seniority: scenario.seniority,
      meeting_type: scenario.meeting_type,
      manager_notes: scenario.manager_notes,
    },
    type_constraints: {
      slug: arcMeta.slug,
      tone_register: arcMeta.tone_register,
      anti_patterns: arcMeta.anti_patterns,
      arc: stageGuide,
    },
    stage_coverage: coverage,
    preparation_brief: prepBrief,
    transcript: compactTranscript(transcript),
    final_turn_check: finalTurn,
    final_evaluation: evaluation,
  };

  return {
    system,
    user: [
      "Evaluate this session output.",
      "Judge whether questions and flow fit the required meeting type.",
      "Provide a 1-5 score and concise evidence.",
      "Return JSON only.",
      JSON.stringify(userPayload, null, 2),
    ].join("\n\n"),
  };
}

async function judgeSession({ sessionDir, scenario, model = DEFAULT_MODEL }) {
  const arcMeta = getArc(scenario.meeting_type);
  const bankQuestions = parseBankQuestions(sessionDir);
  const prep = loadJson(path.join(sessionDir, "01b-preparation/response.json"), {});
  const prepBrief = prep?.brief || prep || {};
  const transcript = loadJson(path.join(sessionDir, "transcript.json"), []);
  const evaluation = loadJson(path.join(sessionDir, "05-evaluation/response.json"), null);
  const coverage = stageCoverageSummary(arcMeta.arc, bankQuestions);

  const messages = buildMessages({
    scenario,
    arcMeta,
    coverage,
    prepBrief,
    transcript,
    evaluation,
  });

  const raw = await callAI({
    system: messages.system,
    user: messages.user,
    schema: RESPONSE_SCHEMA,
    schemaName: "eval_judge_result",
    temperature: 0.1,
    model,
    costLabel: "eval-judge",
  });

  const result = parseAIJson(raw, "Eval judge", ["pass", "score", "arc_coverage", "tone_fit", "evidence", "flags"]);
  const flags = Array.isArray(result.flags) ? result.flags : [];
  const verdict_tier = computeVerdictTier({ score: result.score, flags });
  const hardPass = verdict_tier === "pass";
  return {
    ...result,
    flags,
    pass: hardPass,
    verdict_tier,
    final_turn_check: finalTurnSummary(transcript),
    stage_coverage: coverage,
    model,
  };
}

function parseArgs(argv) {
  const args = { sessionDir: "", scenarioPath: "", model: DEFAULT_MODEL };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--session") args.sessionDir = argv[i + 1] || "";
    if (token === "--scenario") args.scenarioPath = argv[i + 1] || "";
    if (token === "--model") args.model = argv[i + 1] || DEFAULT_MODEL;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.sessionDir || !args.scenarioPath) {
    console.error("Usage: node scripts/eval-judge.js --session <session-dir> --scenario <scenario-json> [--model gpt-5.4-nano]");
    process.exit(2);
  }

  const sessionDir = path.isAbsolute(args.sessionDir) ? args.sessionDir : path.join(ROOT, args.sessionDir);
  const scenarioPath = path.isAbsolute(args.scenarioPath) ? args.scenarioPath : path.join(ROOT, args.scenarioPath);
  const scenario = loadJson(scenarioPath);
  if (!scenario) {
    console.error(`Scenario not found: ${scenarioPath}`);
    process.exit(2);
  }

  const judged = await judgeSession({ sessionDir, scenario, model: args.model });
  console.log(JSON.stringify(judged, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  judgeSession,
  stageCoverageSummary,
  computeVerdictTier,
  finalTurnSummary,
};
