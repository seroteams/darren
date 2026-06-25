const fs = require("node:fs");
const path = require("node:path");

const { callAI, parseAIJson } = require("../ai-client.ts");
const { modelFor } = require("../models.ts");
const { loadLexicon, lexiconScopeFor, resolveLexiconScope, isLexiconReviewScope, candidatePath } = require("../lexicon");
const { RESPONSE_SCHEMA } = require("./schema.ts");
const { appendCandidates, writeTrace, readTrace, tracePathFor } = require("./candidates-io");
const { promptFor } = require("../one-on-one-types");

function shouldReview(ctx) {
  return isLexiconReviewScope(lexiconScopeFor(ctx));
}

function normalizeTranscriptForReview(transcript) {
  return (transcript || []).map((t) => ({
    turn: t.turn,
    manager_question: typeof t.question === "object" ? t.question.name || t.question.label || "" : String(t.question || ""),
    employee_answer: t.skipped ? "(skipped)" : String(t.answer || "").trim(),
    shallow: typeof t.note === "string" && t.note.includes("[SHALLOW]"),
    axis_deltas: t.realized_deltas || {},
  }));
}

function normalizeEvaluation(evalResp) {
  if (!evalResp || typeof evalResp !== "object") return {};
  if (typeof evalResp.raw === "string") {
    try {
      const parsed = JSON.parse(evalResp.raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  return evalResp;
}

function buildPrompt({ scope, ctx, lexicon, transcript, bank, evaluation }) {
  const template = fs.readFileSync(promptFor(ctx.meetingType, "lexicon"), "utf8");
  const reviewTranscript = normalizeTranscriptForReview(transcript);
  const reviewEval = normalizeEvaluation(evaluation);
  const filled = template
    .replaceAll("{{ROLE_FAMILY}}", scope.roleFamily)
    .replaceAll("{{SENIORITY}}", scope.seniority)
    .replaceAll("{{MEETING_TYPE}}", scope.meetingType)
    .replaceAll("{{CURRENT_LEXICON_JSON}}", JSON.stringify(lexicon, null, 2))
    .replaceAll("{{NAME}}", ctx.name || "(unknown)")
    .replaceAll("{{ROLE}}", ctx.role || "(unknown)")
    .replaceAll("{{MEETING_TYPE_LABEL}}", ctx.meetingType || "(unknown)")
    .replaceAll("{{MANAGER_NOTES}}", ctx.notes || "(none)")
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(reviewTranscript, null, 2))
    .replaceAll("{{QUESTION_BANK_JSON}}", JSON.stringify(bank || [], null, 2))
    .replaceAll("{{EVALUATION_JSON}}", JSON.stringify(reviewEval, null, 2));

  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch = filled.match(/## User\s+([\s\S]*)$/);
  return {
    system: systemMatch ? systemMatch[1].trim() : "",
    user: userMatch ? userMatch[1].trim() : filled,
  };
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function extractBankQuestions(bankResp) {
  if (!bankResp) return [];
  if (Array.isArray(bankResp)) return bankResp;
  if (typeof bankResp === "object" && bankResp.raw) {
    try {
      const parsed = JSON.parse(bankResp.raw);
      if (Array.isArray(parsed?.questions)) return parsed.questions;
    } catch {}
  }
  if (typeof bankResp === "string") {
    try {
      const parsed = JSON.parse(bankResp);
      if (Array.isArray(parsed?.questions)) return parsed.questions;
    } catch {}
  }
  return [];
}

function suggestionId(s, i) {
  return `${i}-${s.type}`;
}

async function generateSuggestions({ session, ctx, force = false }) {
  if (!shouldReview(ctx)) return { skipped: true, reason: "out-of-scope" };

  if (!force) {
    const cached = readTrace(session.id);
    if (cached && Array.isArray(cached.allSuggestions)) {
      return {
        skipped: false,
        scope: { roleFamily: cached.roleFamily, seniority: cached.seniority, meetingType: cached.meetingType },
        suggestions: cached.allSuggestions,
        tracePath: tracePathFor(session.id),
        fromCache: true,
      };
    }
  }

  const scope = resolveLexiconScope(ctx);
  const sessionDir = session.dir;

  const transcript = readJsonSafe(path.join(sessionDir, "transcript.json"));
  const bankResp = readJsonSafe(path.join(sessionDir, "03-question-bank", "response.json"));
  const evalResp = readJsonSafe(path.join(sessionDir, "05-evaluation", "response.json"));
  const bankQuestions = extractBankQuestions(bankResp);
  const lexicon = loadLexicon({
    meetingType: ctx.meetingType,
    role: ctx.role,
    seniority: scope.sourceSeniority === "expert" ? "Lead" : ctx.seniority,
  });

  let response;
  try {
    const messages = buildPrompt({ scope, ctx, lexicon, transcript, bank: bankQuestions, evaluation: evalResp });
    const raw = await callAI({
      system: messages.system,
      user: messages.user,
      schema: RESPONSE_SCHEMA,
      schemaName: "lexicon_review",
      temperature: 0.4,
      model: modelFor("evaluation"),
      costLabel: "06-lexicon-review",
    });
    response = parseAIJson(raw, "Lexicon reviewer", ["suggestions"]);
  } catch (e) {
    return { skipped: true, reason: "reviewer-failed", error: e.message };
  }

  const suggestions = Array.isArray(response.suggestions) ? response.suggestions : [];
  const tracePath = writeTrace({
    sessionId: session.id,
    scope,
    allSuggestions: suggestions,
    accepted: [],
    rejected: [],
    userInput: "(pending)",
  });

  return { skipped: false, scope, suggestions, tracePath };
}

function commitDecisions({ session, ctx, keepIds }) {
  if (!shouldReview(ctx)) return { skipped: true, reason: "out-of-scope" };
  const trace = readTrace(session.id);
  if (!trace || !Array.isArray(trace.allSuggestions)) {
    return { skipped: true, reason: "no-trace" };
  }
  const scope = { roleFamily: trace.roleFamily, seniority: trace.seniority, meetingType: trace.meetingType };
  const keepSet = new Set(keepIds || []);
  const accepted = [];
  const rejected = [];
  trace.allSuggestions.forEach((s, i) => {
    const id = suggestionId(s, i);
    if (keepSet.has(id)) accepted.push(s);
    else rejected.push(s);
  });

  let wrote = false;
  if (accepted.length) {
    wrote = appendCandidates(candidatePath(scope.roleFamily, scope.seniority), scope, accepted);
  }

  writeTrace({
    sessionId: session.id,
    scope,
    allSuggestions: trace.allSuggestions,
    accepted,
    rejected,
    userInput: `web:${accepted.length}/${trace.allSuggestions.length}`,
  });

  return { skipped: false, scope, accepted, rejected, wrote };
}

module.exports = {
  shouldReview,
  buildPrompt,
  generateSuggestions,
  commitDecisions,
  suggestionId,
  extractBankQuestions,
  normalizeTranscriptForReview,
  normalizeEvaluation,
};
