import fs from "node:fs";
import path from "node:path";

import { callAI, parseAIJson } from "../ai-client.ts";
import { modelFor } from "../models.ts";
import { loadLexicon, lexiconScopeFor, resolveLexiconScope, isLexiconReviewScope, candidatePath } from "../lexicon.ts";
import { RESPONSE_SCHEMA } from "./schema.ts";
import { appendCandidates, writeTrace, readTrace, tracePathFor } from "./candidates-io.ts";
import { promptFor } from "../one-on-one-types/index.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

// The session context this stage reads. A superset of the lexicon helpers'
// LexiconCtx (which only needs meetingType/role/seniority).
interface ReviewCtx {
  meetingType?: string | null;
  role?: string | null;
  seniority?: string | null;
  name?: string | null;
  notes?: string | null;
}

interface ReviewSession {
  id: string;
  dir: string;
}

// One lexicon suggestion as emitted by the reviewer model and stored in the
// trace. Mirrors candidates-io's (un-exported) AcceptedSuggestion.
interface Suggestion {
  type: string;
  value?: string;
  reason?: string;
  better_as?: string;
}

function isSuggestion(v: unknown): v is Suggestion {
  return isObjectRecord(v) && typeof v.type === "string";
}

function shouldReview(ctx: ReviewCtx): boolean {
  return isLexiconReviewScope(lexiconScopeFor(ctx));
}

function normalizeTranscriptForReview(transcript: unknown): Array<{
  turn: unknown;
  manager_question: string;
  employee_answer: string;
  shallow: boolean;
  axis_deltas: unknown;
}> {
  const list: unknown[] = Array.isArray(transcript) ? transcript : [];
  return list.map((t) => {
    const entry = isObjectRecord(t) ? t : {};
    const q = entry.question;
    const manager_question = isObjectRecord(q)
      ? (typeof q.name === "string" ? q.name : "") || (typeof q.label === "string" ? q.label : "")
      : String(q || "");
    return {
      turn: entry.turn,
      manager_question,
      employee_answer: entry.skipped ? "(skipped)" : String(entry.answer || "").trim(),
      shallow: typeof entry.note === "string" && entry.note.includes("[SHALLOW]"),
      axis_deltas: entry.realized_deltas || {},
    };
  });
}

function normalizeEvaluation(evalResp: unknown): unknown {
  if (!isObjectRecord(evalResp)) return {};
  if (typeof evalResp.raw === "string") {
    try {
      const parsed: unknown = JSON.parse(evalResp.raw);
      if (isObjectRecord(parsed)) return parsed;
    } catch {}
  }
  return evalResp;
}

function buildPrompt({
  scope,
  ctx,
  lexicon,
  transcript,
  bank,
  evaluation,
}: {
  scope: { roleFamily: string | null; seniority: string | null; meetingType: string | null };
  ctx: ReviewCtx;
  lexicon: unknown;
  transcript: unknown;
  bank: unknown;
  evaluation: unknown;
}): { system: string; user: string } {
  const template = fs.readFileSync(promptFor(ctx.meetingType || "", "lexicon"), "utf8");
  const reviewTranscript = normalizeTranscriptForReview(transcript);
  const reviewEval = normalizeEvaluation(evaluation);
  const filled = template
    .replaceAll("{{ROLE_FAMILY}}", String(scope.roleFamily))
    .replaceAll("{{SENIORITY}}", String(scope.seniority))
    .replaceAll("{{MEETING_TYPE}}", String(scope.meetingType))
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
  const sys = systemMatch?.[1];
  const usr = userMatch?.[1];
  return {
    system: sys ? sys.trim() : "",
    user: usr ? usr.trim() : filled,
  };
}

function readJsonSafe(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function extractBankQuestions(bankResp: unknown): unknown[] {
  if (!bankResp) return [];
  if (Array.isArray(bankResp)) return bankResp;
  if (isObjectRecord(bankResp) && bankResp.raw) {
    try {
      const parsed: unknown = JSON.parse(String(bankResp.raw));
      if (isObjectRecord(parsed) && Array.isArray(parsed.questions)) return parsed.questions;
    } catch {}
  }
  if (typeof bankResp === "string") {
    try {
      const parsed: unknown = JSON.parse(bankResp);
      if (isObjectRecord(parsed) && Array.isArray(parsed.questions)) return parsed.questions;
    } catch {}
  }
  return [];
}

function suggestionId(s: { type?: string }, i: number): string {
  return `${i}-${s.type}`;
}

// Discriminated on `skipped` so callers can narrow cleanly (a bare inferred
// return widens `skipped` to boolean and loses the discriminant).
type GenerateResult =
  | { skipped: true; reason: string; error?: string }
  | {
      skipped: false;
      scope: { roleFamily: string | null; seniority: string | null; meetingType: string | null; sourceSeniority?: string };
      suggestions: unknown[];
      tracePath: string;
      fromCache?: boolean;
    };

async function generateSuggestions({
  session,
  ctx,
  force = false,
}: {
  session: ReviewSession;
  ctx: ReviewCtx;
  force?: boolean;
}): Promise<GenerateResult> {
  if (!shouldReview(ctx)) return { skipped: true, reason: "out-of-scope" };

  if (!force) {
    const cached = readTrace(session.id);
    if (isObjectRecord(cached) && Array.isArray(cached.allSuggestions)) {
      const cachedSuggestions: unknown[] = cached.allSuggestions;
      return {
        skipped: false,
        scope: {
          roleFamily: typeof cached.roleFamily === "string" ? cached.roleFamily : null,
          seniority: typeof cached.seniority === "string" ? cached.seniority : null,
          meetingType: typeof cached.meetingType === "string" ? cached.meetingType : null,
        },
        suggestions: cachedSuggestions,
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

  let response: unknown;
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
    return { skipped: true, reason: "reviewer-failed", error: e instanceof Error ? e.message : String(e) };
  }

  const suggestions: unknown[] =
    isObjectRecord(response) && Array.isArray(response.suggestions) ? response.suggestions : [];
  const tracePath = writeTrace({
    sessionId: session.id,
    scope: { roleFamily: scope.roleFamily, seniority: scope.seniority, meetingType: scope.meetingType ?? "" },
    allSuggestions: suggestions,
    accepted: [],
    rejected: [],
    userInput: "(pending)",
  });

  return { skipped: false, scope, suggestions, tracePath };
}

function commitDecisions({
  session,
  ctx,
  keepIds,
}: {
  session: ReviewSession;
  ctx: ReviewCtx;
  keepIds?: string[];
}) {
  if (!shouldReview(ctx)) return { skipped: true, reason: "out-of-scope" };
  const trace = readTrace(session.id);
  if (!isObjectRecord(trace) || !Array.isArray(trace.allSuggestions)) {
    return { skipped: true, reason: "no-trace" };
  }
  const allSuggestions: unknown[] = trace.allSuggestions;
  const scope = {
    roleFamily: typeof trace.roleFamily === "string" ? trace.roleFamily : null,
    seniority: typeof trace.seniority === "string" ? trace.seniority : null,
    meetingType: typeof trace.meetingType === "string" ? trace.meetingType : "",
  };
  const keepSet = new Set(keepIds || []);
  const accepted: Suggestion[] = [];
  const rejected: Suggestion[] = [];
  allSuggestions.forEach((s, i) => {
    if (!isSuggestion(s)) return;
    const id = suggestionId(s, i);
    if (keepSet.has(id)) accepted.push(s);
    else rejected.push(s);
  });

  let wrote = false;
  if (accepted.length) {
    wrote = appendCandidates(candidatePath(scope.roleFamily ?? "", scope.seniority ?? ""), scope, accepted);
  }

  writeTrace({
    sessionId: session.id,
    scope,
    allSuggestions,
    accepted,
    rejected,
    userInput: `web:${accepted.length}/${allSuggestions.length}`,
  });

  return { skipped: false, scope, accepted, rejected, wrote };
}

export {
  shouldReview,
  buildPrompt,
  generateSuggestions,
  commitDecisions,
  suggestionId,
  extractBankQuestions,
  normalizeTranscriptForReview,
  normalizeEvaluation,
};
