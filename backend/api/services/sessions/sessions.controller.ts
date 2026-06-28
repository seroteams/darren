// Thin controller — resolve the request, call the service, format the response.
// No logic, no storage. Phase 004 step 3, sub-phase S1a: the first sessions reads.
//
// v1 puts the session id in the PATH (/api/v1/sessions/:id/…, decision D4); the
// legacy /api/ aliases pass it as ?s=<id>. One controller fn serves both route
// variants — resolve the id here, the service just takes the string (storage-
// agnostic). This id resolution is the only wiring delta vs the other domains.

import type { RequestContext } from "../../router.ts";
import { createSessionsService } from "./sessions.service.ts";
import type { Prewarm, DraftAnswers, ReviewLexicon } from "./sessions.service.ts";
import { fileSessionsRepo } from "./sessions.repo.ts";
import { ensureRoleProfile } from "../../../engine/role-profile.ts";
import { generateFocusPoints } from "../../../engine/generate.ts";
import { generatePreparation } from "../../../engine/preparation.ts";
import { suggestAnswers as draftAnswersEngine } from "../../../engine/answer-suggester.ts";
import { generateSuggestions, shouldReview } from "../../../engine/lexicon-reviewer.ts";
import { generateBankWithFallback, assembleQueueWithPrepOpener, findPrepOpener } from "../../../engine/question-generator.ts";
import { selectReservedCloser } from "../../../engine/closer.ts";
import { evaluate } from "../../../engine/reviewer.ts";
import { serialize } from "../../../engine/axes.ts";
import { getSessionSelectedFocus } from "../../selected-focus.ts";
import { loadPersona, scriptedQuestions } from "../../persona-script.ts";
import { runStage } from "../../handlers/stream-helper.ts";
import { buildPreparationInputs } from "./preparation-inputs.ts";
import { formatNotesForEvaluation } from "./notes-format.ts";
import type { Session } from "../../../shared/session.types.ts";

const IS_DEV = process.env.NODE_ENV !== "production";

// The real AI pre-warm wired into the service's injected boundary: role profile
// first (cache hit adds ~0ms), then focus points — so every stage finds the
// profile on disk. Fire-and-forget, exactly as the legacy /start handler did.
const prewarm: Prewarm = (session, ctx) => {
  ensureRoleProfile(ctx, { session: { id: session.id, dir: session.dir } })
    .catch(() => null)
    .then(() => generateFocusPoints(ctx, { session: { id: session.id, dir: session.dir } }))
    .then((result) => {
      session.focusPointsResult = result;
    })
    .catch(() => {});
};

// The real model calls wired into the S3 injected boundaries (deferred paid walk).
const draftAnswers: DraftAnswers = (i) =>
  draftAnswersEngine({
    ...i.ctx,
    question: i.question,
    questionLabel: i.questionLabel,
    questionDescription: i.questionDescription,
    transcript: i.transcript,
  });
const reviewLexicon: ReviewLexicon = (i) => generateSuggestions({ session: i.session, ctx: i.ctx });

const service = createSessionsService(fileSessionsRepo, { prewarm, draftAnswers, reviewLexicon });

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Reads take the id from the path (v1) or ?s= (legacy).
function sessionId(c: RequestContext): string {
  return c.params.id || c.query.s || "";
}
// Writes take it from the path (v1) or the body's sessionId (legacy).
function writeId(c: RequestContext, body: Record<string, unknown>): string {
  return c.params.id || asString(body.sessionId) || "";
}

// GET /api/v1/sessions/:id  ·  GET /api/session?s=<id>
export function snapshot(c: RequestContext): void {
  c.json(200, service.getSnapshot(sessionId(c)));
}

// GET /api/v1/sessions/:id/lexicon/scope  ·  GET /api/lexicon/scope?s=<id>
export function lexiconScope(c: RequestContext): void {
  c.json(200, service.lexiconScope(sessionId(c)));
}

// GET /api/v1/sessions/:id/role-profile  ·  GET /api/role-profile?s=<id>
export function roleProfile(c: RequestContext): void {
  c.json(200, service.roleProfile(sessionId(c)));
}

// GET /api/v1/sessions/:id/preview  ·  GET /api/preview?s=<id>&stage=<stage>
export function preview(c: RequestContext): void {
  c.json(200, service.preview(sessionId(c), c.query.stage));
}

// GET /api/v1/sessions/:id/question  ·  GET /api/question?s=<id>
export function question(c: RequestContext): void {
  c.json(200, service.question(sessionId(c)));
}

// POST /api/v1/sessions  ·  POST /api/start
// Creates a session (the origin guard + per-IP rate limit live in server.ts, as
// today). 201 with the new session's id/dir/createdAt/introQueueLen.
export async function start(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(201, service.start(body));
}

// POST /api/v1/sessions/:id/answer  ·  POST /api/answer   (202, as today)
export async function answer(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(202, service.answer(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/back  ·  POST /api/back
export async function back(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.back(writeId(c, body)));
}

// POST /api/v1/sessions/:id/notes  ·  POST /api/notes
export async function notes(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.notes(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/agenda/cover  ·  POST /api/agenda/cover
export async function agendaCover(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.agendaCover(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/verdict  ·  POST /api/verdict
export async function verdict(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.verdict(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/focus-points/select  ·  POST /api/focus-points/select
export async function selectedFocus(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.selectedFocus(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/lexicon/decisions  ·  POST /api/lexicon/decisions
export async function lexiconDecisions(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.lexiconDecisions(writeId(c, body), body));
}

// GET /api/v1/sessions/:id/suggest-answers  ·  GET /api/suggest-answers?s=<id>
export async function suggestAnswers(c: RequestContext): Promise<void> {
  c.json(200, await service.suggestAnswers(sessionId(c)));
}

// GET /api/v1/sessions/:id/lexicon/candidates  ·  GET /api/lexicon/candidates?s=<id>
export async function lexiconCandidates(c: RequestContext): Promise<void> {
  c.json(200, await service.lexiconCandidates(sessionId(c)));
}

// --- S4: SSE streams. These manage their own response (no v1Route, like library);
// the shared runStage drives idempotent replay + the model call. The session is
// resolved through the same seam (service.require → 404 before the stream opens).

// GET /api/v1/sessions/:id/focus-points/stream  ·  GET /api/focus-points/stream?s=<id>
export async function focusPointsStream(c: RequestContext): Promise<void> {
  const session = service.require(sessionId(c));
  const force = c.query.regenerate === "1" || c.query.regenerate === "true";
  if (force) {
    session.focusPointsResult = null;
    const inFlight = session.inFlight.get("focus-points");
    if (isObjectRecord(inFlight) && inFlight.controller instanceof AbortController) {
      inFlight.controller.abort();
      session.inFlight.delete("focus-points");
    }
  }

  await runStage(c, session, "focus-points", {
    thinkingLabel: "Choosing focus points",
    getCached: () => session.focusPointsResult,
    setCached: (r) => { session.focusPointsResult = r; },
    produce: () => generateFocusPoints(session.ctx, { session: { id: session.id, dir: session.dir } }),
    resultEvent: "result",
    buildPayload: (r) => ({ meeting_type: r.meeting_type, focus_points: r.focus_points }),
  });
}

// GET /api/v1/sessions/:id/preparation/stream  ·  GET /api/preparation/stream?s=<id>
export async function preparationStream(c: RequestContext): Promise<void> {
  const session = service.require(sessionId(c));
  // Pre-check the prerequisite before opening the stream (kept verbatim from the
  // legacy handler — the runStage produce re-guards via buildPreparationInputs).
  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("Focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "preparation", {
    thinkingLabel: "Preparing your briefing",
    getCached: () => session.preparationResult,
    setCached: (r) => { session.preparationResult = r; },
    produce: () => generatePreparation(
      buildPreparationInputs(session),
      { session: { id: session.id, dir: session.dir } }
    ),
    resultEvent: "result",
    buildPayload: (r) => IS_DEV
      ? { brief: r.brief, runId: r.runId, validation: r.validation }
      : { brief: r.brief, runId: r.runId },
  });
}

// GET /api/v1/sessions/:id/bank/stream  ·  GET /api/bank/stream?s=<id>
export async function bankStream(c: RequestContext): Promise<void> {
  const session = service.require(sessionId(c));
  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "bank", {
    thinkingLabel: session.mode === "scripted" ? "Loading scripted question path" : "Generating question bank",
    getCached: () => (session.bankReady ? { count: session.bankReady.count } : null),
    setCached: (payload) => {
      session.bankReady = payload;
    },
    produce: async () => {
      // Scripted test lane: freeze the question path. Skip live bank generation
      // and load the persona's fixed script as the entire queue, so the only
      // variable between runs is the prompt stage under test. No closer to
      // force-insert — the script defines the exact, ordered path.
      if (session.mode === "scripted") {
        const persona = loadPersona(session.fingerprint?.personaId);
        const scripted = persona ? scriptedQuestions(persona) : [];
        if (scripted.length) {
          session.queueRef = scripted;
          session.totalBudget = scripted.length;
          session.closer = null;
          session.sessionBank = scripted;
          return { count: scripted.length };
        }
      }

      // Guaranteed non-null by the handler's pre-check above; narrowed here for
      // the produce closure (TS can't carry the guard across the callback).
      const focusResult = session.focusPointsResult;
      if (!focusResult) {
        throw Object.assign(new Error("focus points not ready"), { status: 409 });
      }

      const selectedFocus = getSessionSelectedFocus(session);
      const prep = session.preparationResult?.brief || null;
      const bankItems = await generateBankWithFallback(
        {
          focusPoints: focusResult.focus_points,
          ...session.ctx,
          selectedFocus,
          primaryFocusId: selectedFocus?.id,
          existingQueue: session.introQueue,
          prep,
        },
        { session: { id: session.id, dir: session.dir } },
        { onFallback: (e: unknown) => console.warn("[bank] generation failed, falling back to _seed:", e instanceof Error ? e.message : String(e)) }
      );
      session.queueRef = assembleQueueWithPrepOpener(session.introQueue, bankItems, prep, session.ctx.meetingType);
      session.prepOpener = prep ? findPrepOpener(bankItems) : null;

      // Reserve the closer: last bank item tagged with the arc's final stage.
      // plan.js force-inserts this at queueRef[0] when turn + 1 === totalBudget,
      // so the planner can't accidentally drop or rewrite it.
      session.closer = selectReservedCloser(bankItems, session.ctx.meetingType);

      // The legitimate question pool for THIS session (mirrors the CLI loop):
      // assembled queue + reserved prep-opener and closer. The planner's
      // coverage insertion pulls from here instead of the whole global bank,
      // so it can't surface another persona's saved question.
      const seenBankAliases = new Set<string>();
      session.sessionBank = [];
      for (const item of [...session.queueRef, session.prepOpener, session.closer]) {
        if (item?.alias && !seenBankAliases.has(item.alias)) {
          seenBankAliases.add(item.alias);
          session.sessionBank.push(item);
        }
      }

      return { count: bankItems.length };
    },
    resultEvent: "ready",
    buildPayload: (r) => ({ count: r.count }),
  });
}

// Fire-and-forget: kick the per-session lexicon review once the briefing lands
// (only when the session is in scope). Moved verbatim from the deleted handler.
function kickLexiconReview(session: Session): void {
  if (!shouldReview(session.ctx)) return;
  generateSuggestions({ session, ctx: session.ctx }).catch((e: unknown) => {
    console.warn("[evaluation] lexicon review failed:", e instanceof Error ? e.message : String(e));
  });
}

// GET /api/v1/sessions/:id/evaluation/stream  ·  GET /api/evaluation/stream?s=<id>
export async function evaluationStream(c: RequestContext): Promise<void> {
  const session = service.require(sessionId(c));
  const intakeNotes = String(session.ctx?.notes || "").trim();
  const capturedNotes = formatNotesForEvaluation(session.notes || []);
  const notesForEvaluation = [intakeNotes, capturedNotes].filter(Boolean).join("\n\n");

  await runStage(c, session, "evaluation", {
    thinkingLabel: "Final evaluation",
    getCached: () => session.briefing,
    setCached: (r) => {
      const completedAt = Date.now();
      session.completedAt = completedAt;
      session.briefing = {
        ...r,
        cost: session.tracker.summary(),
        completedAt,
      };
      kickLexiconReview(session);
    },
    produce: () => {
      // Evaluation is the last stage, so focus points are always present; narrow
      // here for the produce closure (TS can't carry it in) — the original read
      // session.focusPointsResult.focus_points directly and would throw if absent.
      const focusResult = session.focusPointsResult;
      if (!focusResult) {
        throw Object.assign(new Error("focus points not ready"), { status: 409 });
      }
      const selectedFocus = getSessionSelectedFocus(session);
      return evaluate(
        {
          ctx: session.ctx,
          focusPoints: focusResult.focus_points,
          selectedFocus,
          transcript: session.transcript.map((t) => ({
            question: t.question.name,
            alias: t.question.alias,
            stage: t.question.stage,
            answer: t.answer,
            skipped: t.skipped,
            unbooked_signal: t.unbooked_signal || [],
          })),
          axisState: serialize(session.axisState),
          notes: notesForEvaluation,
          agenda: {
            summary: session.agendaInput?.summary ?? null,
            covered: session.agendaCovered ?? null,
          },
        },
        { session: { id: session.id, dir: session.dir } }
      );
    },
    resultEvent: "briefing",
    buildPayload: (r) => session.briefing || r,
  });
}
