// The guided-sessions service (monthly-checkin Phase 1). Owns the rules of a manager-walked
// 1:1: create it for one of the caller's roster people, auto-save the draft as they walk the
// stages, and complete it. Every op is fenced to the caller's orgId + managerId (and, for
// create/list, to their OWN roster person); a miss answers "not found", never "forbidden"
// (don't confirm the row exists). The interview pipeline is untouched — own table, own service.

import { pgGuidedSessionsRepo } from "./guided-sessions.repo.ts";
import type { GuidedSessionsRepo, GuidedSessionRow, GuidedSessionState } from "./guided-sessions.repo.ts";
import { pgPeopleRepo } from "../team/people.repo.ts";
import { badRequest, notFound } from "../../middleware/http-error.ts";

const GUIDED_STATE_VERSION = 1;
const MONTHLY_ARC = "monthly_check_in";
const FIRST_STAGE = "catchup";
// The runner stages of the monthly arc + the terminal "done". PATCH validates the stage
// against this so a tampered value can't land a nonsense stage. When arc #2 arrives this
// widens to the union of all arcs' stages (architecture.md §2b).
const VALID_STAGES = new Set([
  "catchup",
  "requests",
  "rating",
  "feedback",
  "goals",
  "summary",
  "wrapup",
  "done",
]);

/** The narrow person lookup the guided service needs: a fenced name resolve. Backed by the
 *  people repo in production; a fake in tests. */
export interface GuidedPeopleGateway {
  findForManager(id: string, orgId: string, managerId: string): Promise<{ id: string; name: string } | null>;
}

const defaultPeopleGateway: GuidedPeopleGateway = {
  findForManager: (id, orgId, managerId) => pgPeopleRepo.findForManager(id, orgId, managerId),
};

/** What the runner receives — dates as ISO strings, state passed through. */
export interface GuidedSessionDto {
  id: string;
  personId: string;
  personName: string;
  stage: string;
  state: GuidedSessionState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function toDto(row: GuidedSessionRow): GuidedSessionDto {
  return {
    id: row.id,
    personId: row.personId,
    personName: row.personName,
    stage: row.stage,
    state: row.state,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

// state arrives from the client on each auto-save. Keep the runner's spine sane (v/arc/step/
// visited) and store the per-stage drafts verbatim — the client owns their shape. Reject a
// non-object outright; never corrupt a good draft by over-validating.
function coerceState(input: unknown): GuidedSessionState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("state must be an object");
  }
  const s = input as Record<string, unknown>;
  const step = typeof s.step === "number" && Number.isFinite(s.step) ? s.step : 0;
  const visited = Array.isArray(s.visited) ? s.visited.filter((n): n is number => typeof n === "number") : [];
  const arc = typeof s.arc === "string" ? s.arc : MONTHLY_ARC;
  const v = typeof s.v === "number" ? s.v : GUIDED_STATE_VERSION;
  return { ...s, v, arc, step, visited };
}

// Read the private engagement out of state.wrapup for denormalization at complete().
// Defensive — absent/empty in Phase 1 (the wrap-up UI arrives in Phase 4), so returns null.
function readEngagement(state: GuidedSessionState): number | null {
  const wrapup = state.wrapup;
  if (wrapup && typeof wrapup === "object" && !Array.isArray(wrapup)) {
    const e = (wrapup as Record<string, unknown>).engagement;
    if (typeof e === "number" && Number.isFinite(e)) return e;
  }
  return null;
}

export interface GuidedSessionsService {
  create(orgId: string, managerId: string, input: { personId: unknown }): Promise<GuidedSessionDto>;
  get(id: string, orgId: string, managerId: string): Promise<GuidedSessionDto>;
  listForPerson(personId: string, orgId: string, managerId: string): Promise<{ sessions: GuidedSessionDto[] }>;
  patch(
    id: string,
    orgId: string,
    managerId: string,
    input: { stage?: unknown; state?: unknown },
  ): Promise<GuidedSessionDto>;
  complete(id: string, orgId: string, managerId: string): Promise<GuidedSessionDto>;
}

export function createGuidedSessionsService(
  repo: GuidedSessionsRepo = pgGuidedSessionsRepo,
  people: GuidedPeopleGateway = defaultPeopleGateway,
): GuidedSessionsService {
  /** The caller's own session or a 404 — the fence everything else builds on. */
  async function owned(id: string, orgId: string, managerId: string): Promise<GuidedSessionRow> {
    const row = await repo.findForManager(id, orgId, managerId);
    if (!row) throw notFound("Guided session not found");
    return row;
  }

  /** The caller's own roster person or a 404 (never confirm someone else's exists). */
  async function ownedPerson(
    personId: string,
    orgId: string,
    managerId: string,
  ): Promise<{ id: string; name: string }> {
    const person = await people.findForManager(personId, orgId, managerId);
    if (!person) throw notFound("Person not found");
    return person;
  }

  return {
    async create(orgId, managerId, input) {
      const person = await ownedPerson(String(input.personId ?? ""), orgId, managerId);
      const state: GuidedSessionState = {
        v: GUIDED_STATE_VERSION,
        arc: MONTHLY_ARC,
        step: 0,
        visited: [0],
      };
      const row = await repo.insert({
        orgId,
        managerId,
        personId: person.id,
        personName: person.name,
        stage: FIRST_STAGE,
        state,
      });
      return toDto(row);
    },

    async get(id, orgId, managerId) {
      return toDto(await owned(id, orgId, managerId));
    },

    async listForPerson(personId, orgId, managerId) {
      const person = await ownedPerson(personId, orgId, managerId);
      const rows = await repo.listForPerson(person.id, orgId, managerId);
      return { sessions: rows.map(toDto) };
    },

    async patch(id, orgId, managerId, input) {
      const row = await owned(id, orgId, managerId);
      if (row.completedAt) throw badRequest("This check-in is already finished");
      const patch: { stage?: string; state?: GuidedSessionState } = {};
      if (input.stage !== undefined) {
        const stage = String(input.stage);
        if (!VALID_STAGES.has(stage)) throw badRequest("Unknown stage");
        patch.stage = stage;
      }
      if (input.state !== undefined) patch.state = coerceState(input.state);
      await repo.update(row.id, patch);
      return toDto({ ...row, ...patch });
    },

    async complete(id, orgId, managerId) {
      const row = await owned(id, orgId, managerId);
      if (row.completedAt) return toDto(row); // idempotent — a double-fire never double-writes
      const completedAt = new Date();
      const engagement = readEngagement(row.state);
      // Phase 1: flip to done + stamp completion. (block_scores / promise outcomes / the AI
      // wrap-up land in Phases 3–5.)
      await repo.update(row.id, { stage: "done", completedAt, engagement });
      return toDto({ ...row, stage: "done", completedAt, engagement });
    },
  };
}

export const guidedSessionsService = createGuidedSessionsService();
