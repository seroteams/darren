// The sessions service core — session resolution every sessions controller will
// share. Never touches req/res or storage: all state access goes through the
// injected SessionsRepo (the S0 seam). S1–S4 add the per-route methods (reads,
// writes, AI routes, streams) onto this same service.
//
// `require` is the layered home of the old store's `requireSession`: a missing
// session is a 404. The message text is kept verbatim so the legacy alias's body is
// byte-identical when its route is converted; v1 wraps it in the shared error shape.

import { badRequest, notFound, conflict } from "../../middleware/http-error.ts";
import { INTRO_BUDGET } from "../../sessions.ts";
import { snapshot, inferStage, summarizeAxes } from "./session-views.ts";
import { shouldReview, suggestionId } from "../../../engine/lexicon-reviewer.ts";
import { effectiveTerminology, terminologyGroups } from "../../../engine/role-profile.ts";
import { assemblePreparation } from "../../../engine/preparation.ts";
import { buildPreparationInputs } from "./preparation-inputs.ts";
import { checkQuestionEligibility, dropIneligibleHeads } from "../../../engine/question-eligibility.ts";
import { MEETING_TYPES } from "../../../engine/meeting-types.ts";
import { pickOpener } from "../../../engine/opener.ts";
import { loadIntroQueue } from "../../../engine/intro-queue.ts";
import { getArc } from "../../../engine/meeting-arcs.ts";
import { buildFingerprint } from "../../../engine/run-fingerprint.ts";
import { scriptAnswers } from "../../persona-script.ts";
import { renderNotesMarkdown } from "./notes-format.ts";
import type { SessionsRepo, EligibilityLogEntries, LexiconCommitResult } from "./sessions.repo.ts";
import type { Session, MeetingContext, TesterVerdict, SessionNote, TranscriptEntry } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";
import { isObjectRecord, asRecord, asString } from "../../../shared/guards.ts";

// --- answer helpers (moved verbatim from handlers/answer.ts) ---
const MAX_ANSWER_CHARS = 4000;
function isSkip(input: string): boolean {
  const s = (input || "").trim().toLowerCase();
  return s === "" || s === "skip" || s === "pass" || s === "-";
}

// --- verdict helpers (moved verbatim from handlers/verdict.ts) ---
type Verdict = TesterVerdict["verdict"];
type IssueType = Exclude<TesterVerdict["issue_type"], null>;
function isVerdict(v: unknown): v is Verdict {
  return v === "keep" || v === "fix" || v === "block";
}
const ISSUE_TYPES = new Set<string>([
  "too_generic",
  "wrong_level",
  "bad_tone",
  "over_inferred",
  "missed_focus",
  "weak_action",
]);
function isIssueType(v: unknown): v is IssueType {
  return typeof v === "string" && ISSUE_TYPES.has(v);
}

// The semi-set early agenda question /start always seeds into the intro queue,
// anchored to the meeting arc's first stage. Pure — moved verbatim from the handler.
function buildAgendaCheck(anchorStageId: string | null): Question {
  return Object.freeze({
    alias: "q_intro_agenda_check",
    label: "Agenda check",
    name: "Before we get into it, anything you want to make sure we cover today?",
    description:
      "Semi-set early question. Gives the team member explicit permission to set the agenda before the manager's plan takes over.",
    purpose: "engagement",
    stage: anchorStageId,
    axis_effects: { engagement: 1, clarity: 1 },
    source: "semi_set",
  });
}

// The preview response: either the assembled stage payload or "this stage has no
// previewable payload yet" (200, not an error — the UI just shows nothing).
type PreviewResult =
  | { stage: string; supported: false }
  | { stage: string; label: string; model: string; prompt: string; preview: true };

// The /question response: the next question to ask, or "done" with the agenda.
type QuestionResult =
  | { done: true; agenda: { summary: string | null; covered: boolean | null } }
  | {
      turn: number;
      total: number;
      queueLen: number;
      scripted: { alias: string; answer: string | null; fallback: string } | null;
      question: Pick<Question, "alias" | "label" | "name" | "description" | "purpose">;
    };

// The /start 201 body — the new session's id + dir + when it was created + how
// many intro questions were queued. Byte-identical to the legacy handler.
interface StartResult {
  sessionId: string;
  sessionDir: string;
  createdAt: number;
  introQueueLen: number;
}

// The injected AI pre-warm boundary. /start fires this (fire-and-forget) right
// after persist to cache the role profile then generate focus points, so later
// stages find them on disk. Injected — like suggest-fix's runFix — so the service
// stays model-free + unit-testable; the controller wires the real engine chain.
export type Prewarm = (session: Session, ctx: MeetingContext) => void;

// S3 — the injected AI boundaries (like suggest-fix's runFix), so the service makes
// no model call itself and stays unit-testable. The controller wires the real engine.
export type DraftAnswers = (input: {
  ctx: MeetingContext;
  question: string;
  questionLabel: string;
  questionDescription: string;
  transcript: TranscriptEntry[];
}) => Promise<string[]>;

// The reviewer result the service reads off (a subset of generateSuggestions' shape).
interface LexiconReviewResult {
  skipped?: boolean;
  reason?: string;
  error?: string | null;
  suggestions?: unknown[];
  fromCache?: boolean;
}
export type ReviewLexicon = (input: { session: Session; ctx: MeetingContext }) => Promise<LexiconReviewResult>;

// Everything the sessions service needs injected. All optional so the read/write
// tests (which touch none of these) can keep calling createSessionsService(repo).
export interface SessionsDeps {
  prewarm?: Prewarm;
  draftAnswers?: DraftAnswers;
  reviewLexicon?: ReviewLexicon;
}

// S2b — the non-AI write response bodies (byte-identical to the legacy handlers).
interface AnswerResult { turn: number; skipped: boolean; truncated: boolean }
interface BackResult { turn: number; total: number; answer: string; axes: ReturnType<typeof summarizeAxes> }
interface NotesResult { ok: true; count: number }
interface AgendaResult { ok: true; covered: boolean }
interface VerdictResult { ok: true; verdict: TesterVerdict }
interface SelectedFocusResult { selectedFocusPoints: string[] }
interface LexiconDecisionsResult { ok: true; count: number; committed: number }

// S3 — AI JSON route response bodies.
interface SuggestAnswersResult { answers: string[] }
interface UiCandidate { id: string; type: unknown; phrase: string; context: string }
// One shape with optional error/fromCache — the runtime object only carries the keys
// each branch sets, so the JSON stays byte-identical to the legacy handler's branches.
interface LexiconCandidatesResult {
  candidates: UiCandidate[];
  skipped: string | null;
  error?: string | null;
  fromCache?: boolean;
}

// Pure UI mapping for lexicon candidates (moved verbatim from handlers/lexicon.ts).
function describePhrase(s: Record<string, unknown>): string {
  if (s.type === "prefer_term") return asString(s.value);
  if (s.type === "prefer_phrase") return asString(s.value);
  if (s.type === "avoid_phrase") {
    return s.better_as
      ? `Avoid: "${asString(s.value)}" → try: "${asString(s.better_as)}"`
      : `Avoid: "${asString(s.value)}"`;
  }
  return asString(s.value);
}
function mapForUi(suggestions: unknown[]): UiCandidate[] {
  return suggestions.map((raw, i) => {
    const s = asRecord(raw);
    return {
      id: suggestionId({ type: typeof s.type === "string" ? s.type : undefined }, i),
      type: s.type,
      phrase: describePhrase(s),
      context: asString(s.reason) || asString(s.evidence) || "",
    };
  });
}

// stage -> assemble its payload from a live session, with ZERO API calls. Reuses
// the live run's own assembly so the preview can never drift from what actually
// gets sent (engine honesty). Each returns { label, model, prompt } or throws a
// 409 when its inputs aren't ready. Preparation only for now; others follow.
const PREVIEW_ASSEMBLERS: Record<string, (session: Session) => { label: string; model: string; prompt: string }> = {
  PREPARATION(session) {
    if (!session.focusPointsResult) {
      throw conflict("Focus points not ready for this stage yet");
    }
    return { label: "Prep brief", ...assemblePreparation(buildPreparationInputs(session)) };
  },
};

export interface SessionsService {
  get(id: string): Session | undefined;
  // callerOrgId fences the lookup to the caller's company (the live-session wall):
  // a cross-company id throws 404. Omit it for an internal/unfenced resolve.
  require(id: string, callerOrgId?: string | null): Session;
  create(ctx: MeetingContext, introQueue: Question[], orgId?: string | null, userId?: string | null): Session;
  drop(id: string): void;
  persist(session: Session): void;
  // S1a — free reads (resolve through the seam, then compose a pure derivation):
  getSnapshot(id: string): ReturnType<typeof snapshot>;
  lexiconScope(id: string): { eligible: boolean };
  // S1b — free reads pulling a second store / a pure stage assembler:
  roleProfile(id: string): {
    ready: boolean;
    terminology: ReturnType<typeof effectiveTerminology>;
    terminologyGroups: ReturnType<typeof terminologyGroups>;
  };
  preview(id: string, stage?: string): PreviewResult;
  question(id: string): QuestionResult;
  // S2 — non-AI writes. start leads: create a session + scripted lane, then fire
  // the (injected) AI pre-warm. Takes the already-read request body record + the
  // caller's orgId (the owning company; null/undefined = unfenced legacy/anonymous).
  start(body: Record<string, unknown>, orgId?: string | null, userId?: string | null): StartResult;
  // S2b — the remaining non-AI writes. id is resolved by the controller (v1 path
  // or legacy body.sessionId); the rest of the payload stays in `body`.
  answer(id: string, body: Record<string, unknown>): AnswerResult;
  back(id: string): BackResult;
  notes(id: string, body: Record<string, unknown>): NotesResult;
  agendaCover(id: string, body: Record<string, unknown>): AgendaResult;
  verdict(id: string, body: Record<string, unknown>): VerdictResult;
  selectedFocus(id: string, body: Record<string, unknown>): SelectedFocusResult;
  lexiconDecisions(id: string, body: Record<string, unknown>): LexiconDecisionsResult;
  // S3 — AI JSON routes (the model is the injected boundary; deferred paid walk).
  suggestAnswers(id: string): Promise<SuggestAnswersResult>;
  lexiconCandidates(id: string): Promise<LexiconCandidatesResult>;
}

export function createSessionsService(repo: SessionsRepo, deps: SessionsDeps = {}): SessionsService {
  const prewarm = deps.prewarm ?? (() => {});
  const draftAnswers: DraftAnswers =
    deps.draftAnswers ?? (() => Promise.reject(new Error("draftAnswers boundary not provided")));
  const reviewLexicon: ReviewLexicon =
    deps.reviewLexicon ?? (() => Promise.reject(new Error("reviewLexicon boundary not provided")));

  // The live-session company wall (auth-hardening Phase 1; null-org fix 009 Phase 1).
  // Every read/write/stream resolves a session through here. Default-deny: once a
  // caller has a company context, only a session in that SAME company resolves —
  // anything else throws the same 404 as a missing session, so a cross-company id
  // can't be read, written, or even confirmed to exist. Crucially this also fences
  // *null-org* (anonymous/legacy) sessions away from an org-scoped caller — the
  // escape hatch that made any anonymously-started 1:1 cross-company visible. A
  // null-org session is reachable only by an anonymous caller (callerOrgId === null);
  // omitting callerOrgId (undefined) means "no caller context" (internal/CLI) and
  // skips the wall entirely.
  function requireExisting(id: string, callerOrgId?: string | null): Session {
    const s = repo.get(id);
    if (!s) throw notFound(`Unknown session: ${id}`);
    if (callerOrgId !== undefined && (s.orgId ?? null) !== (callerOrgId ?? null)) {
      throw notFound(`Unknown session: ${id}`);
    }
    return s;
  }

  return {
    get: (id) => repo.get(id),
    require: requireExisting,
    create: (ctx, introQueue, orgId, userId) => repo.create(ctx, introQueue, orgId, userId),
    drop: (id) => repo.drop(id),
    persist: (session) => repo.persist(session),
    getSnapshot: (id) => snapshot(requireExisting(id)),
    lexiconScope: (id) => ({ eligible: shouldReview(requireExisting(id).ctx) }),

    roleProfile: (id) => {
      const doc = repo.loadRoleProfile(requireExisting(id).ctx);
      return {
        ready: Boolean(doc),
        terminology: doc ? effectiveTerminology(doc) : [],
        terminologyGroups: doc ? terminologyGroups(doc.profile) : [],
      };
    },

    preview: (id, stage) => {
      const session = requireExisting(id);
      const resolved = String(stage || inferStage(session)).toUpperCase();
      const assemble = PREVIEW_ASSEMBLERS[resolved];
      if (!assemble) return { stage: resolved, supported: false };
      const { label, model, prompt } = assemble(session);
      return { stage: resolved, label, model, prompt, preview: true };
    },

    question: (id) => {
      const session = requireExisting(id);

      // Serve-time gate — the last line of defence: no question reaches the UI
      // without passing the eligibility check, whichever path queued it. Scripted
      // runs keep their frozen path (log-only) so fixture comparisons stay stable.
      const askedNames = session.transcript.map((t) => t.question.name);
      if (session.mode === "scripted") {
        const head = session.queueRef[0];
        if (head) {
          const check = checkQuestionEligibility(head, {
            meetingType: session.ctx.meetingType,
            askedNames,
          });
          if (!check.ok) {
            console.warn(
              `[question] scripted question would be rejected (${check.reason}): ${head.alias || head.name}`
            );
          }
        }
      } else {
        const rejected = dropIneligibleHeads(session.queueRef, {
          meetingType: session.ctx.meetingType,
          askedNames,
        });
        if (rejected.length) {
          repo.appendEligibilityLog(session.dir, rejected);
          repo.persist(session);
        }
      }

      // queueRef[0] is undefined exactly when the queue is empty, so `!q` is the
      // same terminal condition as the original `queueRef.length === 0` check.
      const q = session.queueRef[0];
      if (session.turn >= session.totalBudget || !q) {
        return {
          done: true,
          agenda: {
            summary: session.agendaInput?.summary ?? null,
            covered: session.agendaCovered ?? null,
          },
        };
      }
      const scripted = session.mode === "scripted"
        ? {
            alias: q.alias,
            answer: session.scriptAnswers?.[q.alias] ?? null,
            fallback: session.scriptedFallback || "",
          }
        : null;
      return {
        turn: session.turn + 1,
        total: session.totalBudget,
        queueLen: session.queueRef.length,
        scripted,
        question: {
          alias: q.alias,
          label: q.label,
          name: q.name,
          description: q.description,
          purpose: q.purpose,
        },
      };
    },

    start: (body, orgId, userId) => {
      const { name, role, seniority, meetingTypeIndex, notes, mode, runLabel, personaId } = body;

      if (typeof name !== "string" || !name.trim()) throw badRequest("name required");
      if (typeof role !== "string" || !role.trim()) throw badRequest("role required");
      if (typeof seniority !== "string" || !seniority.trim()) throw badRequest("seniority required");

      const idx = Number(meetingTypeIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx >= MEETING_TYPES.length)
        throw badRequest("meetingTypeIndex out of range");
      const meetingType = MEETING_TYPES[idx];
      if (!meetingType) throw badRequest("meetingTypeIndex out of range");

      const arc = getArc(meetingType.label);
      const anchorStageId = arc.arc[0]?.id || null;
      const ctx: MeetingContext = {
        name: name.trim(),
        role: role.trim(),
        seniority: seniority.trim(),
        meetingType: meetingType.label,
        notes: asString(notes).trim(),
      };

      const openerRejections: EligibilityLogEntries = [];
      const opener = pickOpener(ctx, { rejections: openerRejections });
      const introRest = loadIntroQueue(meetingType.label, INTRO_BUDGET - 1);
      const introQueue = [opener, buildAgendaCheck(anchorStageId), ...introRest].slice(0, INTRO_BUDGET);
      const session = repo.create(ctx, introQueue, orgId, userId);
      if (openerRejections.length) {
        repo.appendEligibilityLog(session.dir, openerRejections);
      }

      // Scripted test lane: load the persona's fixed script so the bank/planner can
      // freeze the question path (manual mode skips all this).
      const isScripted = mode === "scripted";
      const persona = isScripted ? repo.loadPersona(typeof personaId === "string" ? personaId : null) : null;
      session.mode = isScripted ? "scripted" : "manual";
      session.runLabel = typeof runLabel === "string" ? runLabel.trim() || null : null;
      session.fingerprint = buildFingerprint({
        mode: session.mode,
        runLabel: session.runLabel,
        personaId: persona ? persona.id : null,
        scriptVersion: persona ? persona.script_version : null,
      });
      if (persona) {
        session.scriptAnswers = scriptAnswers(persona);
        session.scriptedFallback = persona.scripted_fallback || null;
        session.scriptCoverage = { aliases_answered_by_script: [], aliases_missing_script: [], fallback_count: 0 };
      }
      repo.persist(session);

      // Pre-warm while the user answers intro questions (fire-and-forget, via the
      // injected boundary so this service makes no model call itself).
      prewarm(session, ctx);

      return {
        sessionId: session.id,
        sessionDir: session.dir,
        createdAt: session.createdAt,
        introQueueLen: introQueue.length,
      };
    },

    answer: (id, body) => {
      const session = requireExisting(id);
      if (session.turn >= session.totalBudget || session.queueRef.length === 0)
        throw conflict("no question pending");

      const raw = typeof body.answer === "string" ? body.answer : "";
      const truncated = raw.length > MAX_ANSWER_CHARS;
      const text = raw.slice(0, MAX_ANSWER_CHARS);
      const skipped = isSkip(text);
      session.pendingAnswer = { raw: text, skipped, text: skipped ? "(skipped)" : text };

      // Scripted test lane only: track scripted vs fallback coverage, persisted to
      // its own file through the seam (log-only — moved from recordCoverage).
      if (session.mode === "scripted") {
        const alias = asString(body.alias);
        const answerSource = asString(body.answerSource);
        const cov = session.scriptCoverage || {
          aliases_answered_by_script: [],
          aliases_missing_script: [],
          fallback_count: 0,
        };
        if (answerSource === "scripted") {
          if (alias && !cov.aliases_answered_by_script.includes(alias)) cov.aliases_answered_by_script.push(alias);
        } else if (answerSource === "fallback") {
          cov.fallback_count += 1;
          if (alias && !cov.aliases_missing_script.includes(alias)) cov.aliases_missing_script.push(alias);
        }
        session.scriptCoverage = cov;
        repo.writeScriptCoverage(session.dir, cov);
      }

      return { turn: session.turn + 1, skipped, truncated };
    },

    back: (id) => {
      const session = requireExisting(id);
      const snap = (session.turnSnapshots || []).pop();
      if (!snap) throw conflict("nothing to go back to");

      // Keep the discarded turn in the amend log (through the seam) so the run
      // record keeps the original answer alongside the amended one.
      repo.appendAmendLog(session.dir, {
        discarded_turn: snap.appliedTurn,
        question_alias: snap.question?.alias ?? null,
        original_answer: snap.answerText ?? "",
      });

      // Full discard & re-run: roll every derived field back to the snapshot taken
      // before that turn was planned.
      session.turn = snap.turn;
      session.totalBudget = snap.totalBudget;
      session.queueRef = snap.queueRef;
      session.axisState = snap.axisState;
      session.transcript = snap.transcript;
      session.agendaInjected = snap.agendaInjected;
      session.agendaInput = snap.agendaInput;
      session.pendingAnswer = null;
      session.lastPlanByTurn.delete(snap.appliedTurn);
      repo.persist(session);

      return {
        turn: session.turn + 1,
        total: session.totalBudget,
        answer: snap.answerText ?? "",
        axes: summarizeAxes(session.axisState),
      };
    },

    notes: (id, body) => {
      const note = asRecord(body.note);
      if (!id) throw badRequest("sessionId required");
      if (!body.note || typeof body.note !== "object") throw badRequest("note required");
      if (!note.id) throw badRequest("note.id required");

      const session = requireExisting(id);
      if (!Array.isArray(session.notes)) session.notes = [];

      const noteId = String(note.id);
      const existingIdx = session.notes.findIndex((n) => n.id === noteId);
      const isDelete = note.deleted === true || (typeof note.text === "string" && !note.text.trim());

      if (isDelete) {
        if (existingIdx >= 0) session.notes.splice(existingIdx, 1);
      } else {
        const existing = existingIdx >= 0 ? session.notes[existingIdx] : undefined;
        const entry: SessionNote = {
          id: noteId,
          stage: String(note.stage || (existing ? existing.stage : "")),
          turn: Number.isFinite(note.turn) ? Number(note.turn) : existing ? existing.turn : 0,
          ts: Number.isFinite(note.ts) ? Number(note.ts) : existing ? existing.ts : Date.now(),
          text: String(note.text).slice(0, 4000),
          question_alias: String(note.question_alias || (existing ? existing.question_alias : ""))
            .trim()
            .slice(0, 120),
          question_stem: String(note.question_stem || (existing ? existing.question_stem : ""))
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80),
        };
        if (existingIdx >= 0) session.notes[existingIdx] = entry;
        else session.notes.push(entry);
      }

      repo.persist(session);
      repo.writeNotesFile(session.dir, renderNotesMarkdown(session));
      return { ok: true, count: session.notes.length };
    },

    agendaCover: (id, body) => {
      const session = requireExisting(id);
      session.agendaCovered = body.covered === true;
      repo.persist(session);
      return { ok: true, covered: session.agendaCovered };
    },

    verdict: (id, body) => {
      const session = requireExisting(id);
      const verdictValue = body.verdict;
      const issueType = body.issue_type;
      const note = body.note;

      if (!isVerdict(verdictValue)) throw badRequest("invalid verdict");
      if (issueType && !isIssueType(issueType)) throw badRequest("invalid issue_type");

      const verdict: TesterVerdict = {
        verdict: verdictValue,
        issue_type: isIssueType(issueType) ? issueType : null,
        note: typeof note === "string" ? note.trim() || null : null,
        at: Date.now(),
      };
      session.verdict = verdict;
      repo.persist(session);
      return { ok: true, verdict };
    },

    selectedFocus: (id, body) => {
      const session = requireExisting(id);
      const ids = Array.isArray(body.focusPointIds)
        ? body.focusPointIds.map((x: unknown) => String(x || "").trim()).filter(Boolean)
        : [];
      session.selectedFocusPoints = ids;
      repo.persist(session);
      return { selectedFocusPoints: ids };
    },

    lexiconDecisions: (id, body) => {
      if (!id) throw badRequest("sessionId required");
      const session = requireExisting(id);
      const list = body.decisions;
      const records: unknown[] = Array.isArray(list) ? list : [];

      // Audit trail in the session dir — full keep/drop log, regardless of scope.
      if (records.length) {
        repo.appendLexiconDecisions(session.dir, records);
      }

      // Roll keeps into the candidate yaml when scope is reviewable.
      const keepIds = records
        .filter((r): r is Record<string, unknown> => isObjectRecord(r) && Boolean(r.keep))
        .map((r) => asString(r.id));
      let commit: LexiconCommitResult = { skipped: true, reason: "out-of-scope" };
      if (shouldReview(session.ctx)) {
        commit = repo.commitLexiconDecisions(session, session.ctx, keepIds);
      }

      const committed = "accepted" in commit && Array.isArray(commit.accepted) ? commit.accepted.length : 0;
      return { ok: true, count: records.length, committed };
    },

    suggestAnswers: async (id) => {
      const session = requireExisting(id);
      const q = session.queueRef[0];
      if (!q) return { answers: [] };
      try {
        const answers = await draftAnswers({
          ctx: session.ctx,
          question: q.name,
          questionLabel: q.label || "",
          questionDescription: q.description || "",
          transcript: session.transcript,
        });
        return { answers };
      } catch (e) {
        // Failures degrade to an empty list — the UI shows nothing rather than blocking.
        console.warn("[suggest-answers] failed:", e instanceof Error ? e.message : String(e));
        return { answers: [] };
      }
    },

    lexiconCandidates: async (id) => {
      if (!id) throw badRequest("sessionId required");
      const session = requireExisting(id);
      if (!shouldReview(session.ctx)) return { candidates: [], skipped: "out-of-scope" };
      try {
        const result = await reviewLexicon({ session, ctx: session.ctx });
        if (result.skipped) {
          return { candidates: [], skipped: result.reason || "skipped", error: result.error || null };
        }
        const suggestions = result.suggestions || [];
        return {
          candidates: mapForUi(suggestions),
          skipped: suggestions.length ? null : "empty",
          fromCache: Boolean(result.fromCache),
        };
      } catch (e) {
        // Surface honestly: legacy keeps this message (500), v1 masks 5xx.
        const msg = (e instanceof Error && e.message) || "lexicon review failed";
        throw Object.assign(new Error(msg), { status: 500 });
      }
    },
  };
}
