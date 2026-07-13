// Monthly Check-in guided-session logic (monthly-one-on-one Phase 1). Pure over the
// injected repos — no req/res, no direct storage — so it's unit-tested with in-memory
// fakes. Two fences, defence-in-depth:
//   1. person ownership — a session can only be created/listed for a roster person the
//      caller actually manages (people repo, org + manager).
//   2. session ownership — every read/patch/complete is fenced to the caller's
//      org + manager (the guided-sessions repo), so one manager can never touch
//      another's session even with a guessed id.
// The role wall (internal-only) lives in the controller (requireInternalAdmin).

import { notFound, badRequest } from "../../middleware/http-error.ts";
import type { GuidedSessionsRepo, GuidedSessionRow } from "./guided-sessions.repo.ts";
import type { PeopleRepo, PersonRow } from "../team/people.repo.ts";

/** The seven walkable stages, in order — the resume marker. "done" is the terminal
 *  state a completed session flips to. The runner reads its arc from guided-arcs.ts;
 *  this list is the server-side allow-set that PATCH validates against. */
export const GUIDED_STAGES = ["catchup", "requests", "rating", "feedback", "goals", "summary", "wrapup"] as const;
export type GuidedStage = (typeof GUIDED_STAGES)[number] | "done";
const STAGE_SET = new Set<string>([...GUIDED_STAGES, "done"]);

/** A fresh draft. `v` is the schema version so a later shape change can migrate old
 *  rows; every stage's data lands under its own key, all reads defensive. */
export function initialGuidedState(): { v: number } {
  return { v: 1 };
}

/** What the client sees — never the org/manager fence columns (it's their own session,
 *  but there's no reason to ship them). */
export interface GuidedSessionView {
  id: string;
  personId: string;
  stage: string;
  state: unknown;
  engagement: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function toView(row: GuidedSessionRow): GuidedSessionView {
  return {
    id: row.id,
    personId: row.personId,
    stage: row.stage,
    state: row.state ?? initialGuidedState(),
    engagement: row.engagement,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export interface GuidedSessionsService {
  create(orgId: string, managerId: string, personId: string): Promise<GuidedSessionView>;
  get(id: string, orgId: string, managerId: string): Promise<GuidedSessionView>;
  listForPerson(personId: string, orgId: string, managerId: string): Promise<GuidedSessionView[]>;
  patch(
    id: string,
    orgId: string,
    managerId: string,
    patch: { stage?: unknown; state?: unknown },
  ): Promise<GuidedSessionView>;
  complete(id: string, orgId: string, managerId: string): Promise<GuidedSessionView>;
}

export function createGuidedSessionsService(deps: {
  repo: GuidedSessionsRepo;
  people: Pick<PeopleRepo, "findForManager">;
}): GuidedSessionsService {
  const { repo, people } = deps;

  // The person-fence: resolve the roster person the caller manages, or 404. A person
  // in another org / another manager's roster is indistinguishable from a missing one.
  async function assertOwnsPerson(personId: string, orgId: string, managerId: string): Promise<PersonRow> {
    const person = await people.findForManager(personId, orgId, managerId);
    if (!person) throw notFound("Person not found");
    return person;
  }

  // The session-fence: resolve the caller's own guided session, or 404.
  async function own(id: string, orgId: string, managerId: string): Promise<GuidedSessionRow> {
    const row = await repo.findForManager(id, orgId, managerId);
    if (!row) throw notFound("Guided session not found");
    return row;
  }

  return {
    async create(orgId, managerId, personId) {
      if (!personId) throw badRequest("personId is required");
      const person = await assertOwnsPerson(personId, orgId, managerId);
      const row = await repo.create({
        orgId,
        managerId,
        personId,
        personName: person.name,
        stage: "catchup",
        state: initialGuidedState(),
      });
      return toView(row);
    },

    async get(id, orgId, managerId) {
      return toView(await own(id, orgId, managerId));
    },

    async listForPerson(personId, orgId, managerId) {
      await assertOwnsPerson(personId, orgId, managerId);
      const rows = await repo.listForPerson(personId, orgId, managerId);
      return rows.map(toView);
    },

    async patch(id, orgId, managerId, patch) {
      await own(id, orgId, managerId); // fence before any write
      const set: { stage?: string; state?: unknown } = {};
      if (patch.stage !== undefined) {
        const stage = String(patch.stage);
        if (!STAGE_SET.has(stage)) throw badRequest(`Unknown stage "${stage}"`);
        set.stage = stage;
      }
      if (patch.state !== undefined) set.state = patch.state;
      await repo.update(id, set);
      return toView(await own(id, orgId, managerId));
    },

    async complete(id, orgId, managerId) {
      await own(id, orgId, managerId); // fence before the flip
      // Phase 1: flip to "done" + stamp completion only. block_scores / engagement
      // denormalisation + promise outcomes arrive in later phases.
      await repo.update(id, { stage: "done", completedAt: new Date() });
      return toView(await own(id, orgId, managerId));
    },
  };
}
