// The sessions service core — session resolution every sessions controller will
// share. Never touches req/res or storage: all state access goes through the
// injected SessionsRepo (the S0 seam). S1–S4 add the per-route methods (reads,
// writes, AI routes, streams) onto this same service.
//
// `require` is the layered home of the old store's `requireSession`: a missing
// session is a 404. The message text is kept verbatim so the legacy alias's body is
// byte-identical when its route is converted; v1 wraps it in the shared error shape.

import { badRequest, notFound, conflict } from "../../middleware/http-error.ts";
import { snapshot, inferStage, INTRO_BUDGET } from "../../sessions.ts";
import { shouldReview } from "../../../engine/lexicon-reviewer.ts";
import { effectiveTerminology, terminologyGroups } from "../../../engine/role-profile.ts";
import { assemblePreparation } from "../../../engine/preparation.ts";
import { buildPreparationInputs } from "../../handlers/preparation.ts";
import { checkQuestionEligibility, dropIneligibleHeads } from "../../../engine/question-eligibility.ts";
import { MEETING_TYPES } from "../../../engine/meeting-types.ts";
import { pickOpener } from "../../../engine/opener.ts";
import { loadIntroQueue } from "../../../engine/intro-queue.ts";
import { getArc } from "../../../engine/meeting-arcs.ts";
import { buildFingerprint } from "../../../engine/run-fingerprint.ts";
import { scriptAnswers } from "../../persona-script.ts";
import type { SessionsRepo, EligibilityLogEntries } from "./sessions.repo.ts";
import type { Session, MeetingContext } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
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
  require(id: string): Session;
  create(ctx: MeetingContext, introQueue: Question[]): Session;
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
  // the (injected) AI pre-warm. Takes the already-read request body record.
  start(body: Record<string, unknown>): StartResult;
}

export function createSessionsService(repo: SessionsRepo, prewarm: Prewarm = () => {}): SessionsService {
  function requireExisting(id: string): Session {
    const s = repo.get(id);
    if (!s) throw notFound(`Unknown session: ${id}`);
    return s;
  }

  return {
    get: (id) => repo.get(id),
    require: requireExisting,
    create: (ctx, introQueue) => repo.create(ctx, introQueue),
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

    start: (body) => {
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
      const session = repo.create(ctx, introQueue);
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
  };
}
