// The sessions service core — session resolution every sessions controller will
// share. Never touches req/res or storage: all state access goes through the
// injected SessionsRepo (the S0 seam). S1–S4 add the per-route methods (reads,
// writes, AI routes, streams) onto this same service.
//
// `require` is the layered home of the old store's `requireSession`: a missing
// session is a 404. The message text is kept verbatim so the legacy alias's body is
// byte-identical when its route is converted; v1 wraps it in the shared error shape.

import { notFound, conflict } from "../../middleware/http-error.ts";
import { snapshot, inferStage } from "../../sessions.ts";
import { shouldReview } from "../../../engine/lexicon-reviewer.ts";
import { effectiveTerminology, terminologyGroups } from "../../../engine/role-profile.ts";
import { assemblePreparation } from "../../../engine/preparation.ts";
import { buildPreparationInputs } from "../../handlers/preparation.ts";
import { checkQuestionEligibility, dropIneligibleHeads } from "../../../engine/question-eligibility.ts";
import type { SessionsRepo } from "./sessions.repo.ts";
import type { Session, MeetingContext } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";

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
}

export function createSessionsService(repo: SessionsRepo): SessionsService {
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
  };
}
