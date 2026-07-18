// The trackers service (monthly-checkin Phase 2). Owns the rules of the shared promise/
// request/goal domain: per-kind status vocabularies, a dated history event on every change,
// and the manager fence (the person must be the caller's roster person — 404 otherwise, never
// "forbidden"). Reads/writes are org-fenced in the repo; ownership is re-checked here via the
// people wall — a drifted column can hide a row, never leak one. The member read/write lane
// (Phase 7) uses trackerVisibleToMember + its own endpoints; it never touches these.

import { pgTrackersRepo } from "./trackers.repo.ts";
import type { TrackerEvent, TrackerItemRow, TrackerKind, TrackersRepo } from "./trackers.repo.ts";
import { pgPeopleRepo } from "../team/people.repo.ts";
import { badRequest, notFound } from "../../middleware/http-error.ts";

const KINDS: TrackerKind[] = ["promise", "request", "goal"];
const STATUS_SETS: Record<TrackerKind, string[]> = {
  promise: ["open", "done", "partly", "not_done", "changed"],
  request: ["new", "in_progress", "resolved"],
  goal: ["not_started", "in_progress", "done"],
};
const INITIAL_STATUS: Record<TrackerKind, string> = {
  promise: "open",
  request: "new",
  goal: "not_started",
};
const CATEGORIES = ["growth_development", "ideas_suggestions", "concerns_feedback"];
const OWNERS = ["manager", "member"];
/** A Catch-up outcome chip value → the promise status it resolves to. */
export const OUTCOME_TO_STATUS: Record<string, string> = {
  yes: "done",
  partly: "partly",
  no: "not_done",
  changed: "changed",
};
const TEXT_CAP = 500;
const NOTE_CAP = 1000;

// ── fence walls (architecture.md §3.2) ─────────────────────────────────────────────────────
/** Manager wall: the row is in the caller's org (the person→manager check is done separately
 *  via the people repo). SQL already narrows on org_id; this re-checks the authoritative row. */
export function trackerOwnedByManagerOrg(row: TrackerItemRow, orgId: string): boolean {
  return row.orgId === orgId;
}
/** Member wall (used by Phase 7's member lane): a member sees ONLY request/goal rows for one of
 *  THEIR OWN person records — never promises, never another person. Defined now so the member
 *  lane has one proven predicate to fence on. */
export function trackerVisibleToMember(row: TrackerItemRow, personIds: string[], orgId: string): boolean {
  return row.orgId === orgId && personIds.includes(row.personId) && row.kind !== "promise";
}

/** The person lookups the service needs: the manager fence (findForManager) + the member fence
 *  (findByLinkedUser — the roster people this member account IS, via people.user_id). */
export interface TrackerPeopleGateway {
  findForManager(id: string, orgId: string, managerId: string): Promise<{ id: string; name: string } | null>;
  findByLinkedUser(userId: string, orgId: string): Promise<{ id: string }[]>;
}
const defaultPeopleGateway: TrackerPeopleGateway = {
  findForManager: (id, orgId, managerId) => pgPeopleRepo.findForManager(id, orgId, managerId),
  findByLinkedUser: (userId, orgId) => pgPeopleRepo.findByLinkedUser(userId, orgId),
};

export interface TrackerItemDto {
  id: string;
  personId: string;
  kind: TrackerKind;
  text: string;
  owner: string | null;
  category: string | null;
  status: string;
  progress: number;
  history: TrackerEvent[];
  createdSessionId: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

function toDto(row: TrackerItemRow): TrackerItemDto {
  return {
    id: row.id,
    personId: row.personId,
    kind: row.kind,
    text: row.text,
    owner: row.owner,
    category: row.category,
    status: row.status,
    progress: row.progress,
    history: row.history,
    createdSessionId: row.createdSessionId,
    archived: row.archivedAt != null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface GroupedTrackers {
  promises: TrackerItemDto[];
  requests: TrackerItemDto[];
  goals: TrackerItemDto[];
}

function cleanText(v: unknown, cap = TEXT_CAP): string {
  if (typeof v !== "string" || !v.trim()) throw badRequest("text is required");
  return v.trim().slice(0, cap);
}
function nowIso(): string {
  return new Date().toISOString();
}

export interface TrackersService {
  listForPerson(
    personId: string,
    orgId: string,
    managerId: string,
    opts?: { includeArchived?: boolean },
  ): Promise<GroupedTrackers>;
  create(
    personId: string,
    orgId: string,
    managerId: string,
    input: {
      kind: unknown;
      text: unknown;
      owner?: unknown;
      category?: unknown;
      status?: unknown;
      progress?: unknown;
      note?: unknown;
      createdSessionId?: string | null;
    },
  ): Promise<{ item: TrackerItemDto }>;
  update(
    id: string,
    orgId: string,
    managerId: string,
    input: {
      text?: unknown;
      status?: unknown;
      progress?: unknown;
      category?: unknown;
      note?: unknown;
      archived?: unknown;
    },
  ): Promise<{ item: TrackerItemDto }>;
  /** Resolve a Catch-up promise (yes/partly/no/changed) — used by guided complete(). */
  applyOutcome(id: string, orgId: string, managerId: string, outcome: string): Promise<{ item: TrackerItemDto }>;

  // ── Member lane (Phase 7) — fenced to the caller's OWN person (people.user_id = caller) and to
  //    kind ∈ {request, goal}; never promises, never another person, never guided_sessions. ──
  /** The member's own requests + goals (never promises). Empty for an unlinked member. */
  listForMember(userId: string, orgId: string): Promise<{ requests: TrackerItemDto[]; goals: TrackerItemDto[] }>;
  /** The member raises a request on their own person (status starts "new"). */
  createRequestForMember(
    userId: string,
    orgId: string,
    input: { text: unknown; category?: unknown },
  ): Promise<{ item: TrackerItemDto }>;
  /** The member updates progress % / adds a note on THEIR OWN goal (never status, never create/close). */
  updateGoalForMember(
    userId: string,
    orgId: string,
    goalId: string,
    input: { progress?: unknown; note?: unknown },
  ): Promise<{ item: TrackerItemDto }>;
}

export function createTrackersService(
  repo: TrackersRepo = pgTrackersRepo,
  people: TrackerPeopleGateway = defaultPeopleGateway,
): TrackersService {
  /** The caller's own roster person or a 404 (never confirm someone else's exists). */
  async function ownedPerson(personId: string, orgId: string, managerId: string): Promise<void> {
    const person = await people.findForManager(personId, orgId, managerId);
    if (!person) throw notFound("We couldn't find that person — refresh and try again.");
  }

  /** An item the caller may touch: org-fenced AND its person is the caller's. */
  async function owned(id: string, orgId: string, managerId: string): Promise<TrackerItemRow> {
    const row = await repo.findById(id, orgId);
    if (!row || !trackerOwnedByManagerOrg(row, orgId)) throw notFound("Item not found");
    await ownedPerson(row.personId, orgId, managerId); // person→manager wall (404 if not theirs)
    return row;
  }

  function validateStatus(kind: TrackerKind, status: string): string {
    if (!STATUS_SETS[kind].includes(status)) throw badRequest(`Invalid status for a ${kind}`);
    return status;
  }

  return {
    async listForPerson(personId, orgId, managerId, opts) {
      await ownedPerson(personId, orgId, managerId);
      const rows = await repo.listForPerson(personId, orgId);
      const active = opts?.includeArchived ? rows : rows.filter((r) => r.archivedAt == null);
      const of = (k: TrackerKind): TrackerItemDto[] => active.filter((r) => r.kind === k).map(toDto);
      const promises = of("promise").sort(
        // the manager's own promises first (prototype: "manager's own FIRST")
        (a, b) => (a.owner === "manager" ? 0 : 1) - (b.owner === "manager" ? 0 : 1),
      );
      return { promises, requests: of("request"), goals: of("goal") };
    },

    async create(personId, orgId, managerId, input) {
      await ownedPerson(personId, orgId, managerId);
      const kind = input.kind;
      if (typeof kind !== "string" || !KINDS.includes(kind as TrackerKind)) {
        throw badRequest("kind must be promise, request or goal");
      }
      const k = kind as TrackerKind;
      const text = cleanText(input.text);
      const status = input.status === undefined ? INITIAL_STATUS[k] : validateStatus(k, String(input.status));

      let owner: string | null = null;
      if (k === "promise") {
        owner = input.owner === undefined ? "manager" : String(input.owner);
        if (!OWNERS.includes(owner)) throw badRequest("owner must be manager or member");
      }
      let category: string | null = null;
      if (k === "request") {
        category = input.category === undefined ? "growth_development" : String(input.category);
        if (!CATEGORIES.includes(category)) throw badRequest("Invalid request category");
      }
      let progress = 0;
      if (k === "goal" && input.progress !== undefined) {
        const p = Number(input.progress);
        progress = Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 0;
      }

      const history: TrackerEvent[] = [{ at: nowIso(), type: "created", by: managerId }];
      const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, NOTE_CAP) : "";
      if (note) history.push({ at: nowIso(), type: "note", note, by: managerId });

      const row = await repo.insert({
        orgId,
        personId,
        createdByUserId: managerId || null,
        kind: k,
        text,
        owner,
        category,
        status,
        progress,
        history,
        createdSessionId: input.createdSessionId ?? null,
      });
      return { item: toDto(row) };
    },

    async update(id, orgId, managerId, input) {
      const row = await owned(id, orgId, managerId);
      const patch: Partial<Pick<TrackerItemRow, "text" | "category" | "status" | "progress" | "history" | "archivedAt">> = {};
      const history = [...row.history];

      if (input.text !== undefined) patch.text = cleanText(input.text);
      if (input.category !== undefined && row.kind === "request") {
        const c = String(input.category);
        if (!CATEGORIES.includes(c)) throw badRequest("Invalid request category");
        patch.category = c;
      }
      if (input.status !== undefined) {
        const s = validateStatus(row.kind, String(input.status));
        if (s !== row.status) {
          patch.status = s;
          history.push({ at: nowIso(), type: "status", from: row.status, to: s, by: managerId });
        }
      }
      if (input.progress !== undefined && row.kind === "goal") {
        const p = Number(input.progress);
        const clamped = Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : row.progress;
        if (clamped !== row.progress) {
          patch.progress = clamped;
          history.push({ at: nowIso(), type: "progress", from: String(row.progress), to: String(clamped), by: managerId });
        }
      }
      if (typeof input.note === "string" && input.note.trim()) {
        history.push({ at: nowIso(), type: "note", note: input.note.trim().slice(0, NOTE_CAP), by: managerId });
      }
      if (input.archived !== undefined) {
        patch.archivedAt = input.archived ? new Date() : null;
      }
      patch.history = history;

      await repo.update(row.id, patch);
      return { item: toDto({ ...row, ...patch }) };
    },

    async applyOutcome(id, orgId, managerId, outcome) {
      const row = await owned(id, orgId, managerId);
      if (row.kind !== "promise") throw badRequest("Outcomes apply to promises only");
      const status = OUTCOME_TO_STATUS[outcome];
      if (!status) throw badRequest("Unknown outcome");
      const history = [...row.history, { at: nowIso(), type: "outcome", from: row.status, to: status, by: managerId }];
      await repo.update(row.id, { status, history });
      return { item: toDto({ ...row, status, history }) };
    },

    // ── Member lane ────────────────────────────────────────────────────────────────────────
    async listForMember(userId, orgId) {
      const own = await people.findByLinkedUser(userId, orgId);
      const personIds = own.map((p) => p.id);
      if (!personIds.length) return { requests: [], goals: [] };
      const all: TrackerItemRow[] = [];
      for (const pid of personIds) all.push(...(await repo.listForPerson(pid, orgId)));
      // trackerVisibleToMember is the wall: org + own person + kind ≠ promise.
      const visible = all.filter((r) => trackerVisibleToMember(r, personIds, orgId) && r.archivedAt == null);
      return {
        requests: visible.filter((r) => r.kind === "request").map(toDto),
        goals: visible.filter((r) => r.kind === "goal").map(toDto),
      };
    },

    async createRequestForMember(userId, orgId, input) {
      const own = await people.findByLinkedUser(userId, orgId);
      const person = own[0];
      if (!person) throw notFound("No linked person"); // unlinked member — clean 404
      const text = cleanText(input.text);
      const category = input.category === undefined ? "growth_development" : String(input.category);
      if (!CATEGORIES.includes(category)) throw badRequest("Invalid request category");
      const history: TrackerEvent[] = [{ at: nowIso(), type: "created", by: userId }];
      const row = await repo.insert({
        orgId,
        personId: person.id,
        createdByUserId: userId,
        kind: "request",
        text,
        owner: null,
        category,
        status: "new",
        progress: 0,
        history,
        createdSessionId: null,
      });
      return { item: toDto(row) };
    },

    async updateGoalForMember(userId, orgId, goalId, input) {
      const own = await people.findByLinkedUser(userId, orgId);
      const personIds = own.map((p) => p.id);
      const row = await repo.findById(goalId, orgId);
      // Fence: must be a GOAL for one of the member's OWN people. A promise/request id, another
      // person's row, or an unknown id all answer the same 404 — nothing confirmed, nothing leaked.
      if (!row || row.kind !== "goal" || !trackerVisibleToMember(row, personIds, orgId)) {
        throw notFound("Goal not found");
      }
      const history = [...row.history];
      const patch: Partial<Pick<TrackerItemRow, "progress" | "history">> = {};
      if (input.progress !== undefined) {
        const p = Number(input.progress);
        const clamped = Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : row.progress;
        if (clamped !== row.progress) {
          patch.progress = clamped;
          history.push({ at: nowIso(), type: "progress", from: String(row.progress), to: String(clamped), by: userId });
        }
      }
      if (typeof input.note === "string" && input.note.trim()) {
        history.push({ at: nowIso(), type: "note", note: input.note.trim().slice(0, NOTE_CAP), by: userId });
      }
      patch.history = history;
      await repo.update(row.id, patch);
      return { item: toDto({ ...row, ...patch }) };
    },
  };
}

export const trackersService = createTrackersService();
