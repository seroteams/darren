// Per-person tracker logic (monthly-one-on-one Phase 2). Pure over the injected repos, so
// it's unit-tested with in-memory fakes. Double-fenced like guided sessions:
//   1. person ownership — every read/write is for a roster person the caller manages
//      (people repo, org + manager).
//   2. org — findForOrg narrows the item to the caller's org before the person re-check,
//      so a drifted row can hide but never leak.
// Per-kind STATUS validation lives here (the DB column is plain text, one column, three
// kinds). Every mutation appends a dated history event.

import { notFound, badRequest } from "../../middleware/http-error.ts";
import type { TrackersRepo, TrackerItemRow, TrackerHistoryEvent } from "./trackers.repo.ts";
import type { PeopleRepo } from "../team/people.repo.ts";

export type TrackerKind = "promise" | "request" | "goal";

// The per-kind status sets — the DB column is service-validated text.
const STATUS_BY_KIND: Record<TrackerKind, string[]> = {
  promise: ["open", "done", "partly", "not_done", "changed"],
  request: ["new", "in_progress", "resolved"],
  goal: ["not_started", "in_progress", "done"],
};
const DEFAULT_STATUS: Record<TrackerKind, string> = { promise: "open", request: "new", goal: "not_started" };
const OWNERS = ["manager", "member"];
const CATEGORIES = ["growth_development", "ideas_suggestions", "concerns_feedback"];

// Catch-up outcome chip value → the promise status it applies at complete().
const OUTCOME_TO_STATUS: Record<string, string> = {
  yes: "done",
  partly: "partly",
  no: "not_done",
  changed: "changed",
};

// Human-readable status labels for the synthesized history line on a status-only change.
const STATUS_LABEL: Record<string, string> = {
  open: "Open", done: "Done", partly: "Partly done", not_done: "Not done", changed: "Changed",
  new: "New", in_progress: "In progress", resolved: "Resolved",
  not_started: "Not started",
};

function isKind(v: unknown): v is TrackerKind {
  return v === "promise" || v === "request" || v === "goal";
}

/** The client view of one item (never the org fence column). */
export interface TrackerView {
  id: string;
  kind: string;
  text: string;
  owner: string | null;
  category: string | null;
  status: string;
  progress: number | null;
  history: TrackerHistoryEvent[];
  createdSessionId: string | null;
}

export interface GroupedTrackers {
  promises: TrackerView[];
  requests: TrackerView[];
  goals: TrackerView[];
}

function toView(row: TrackerItemRow): TrackerView {
  return {
    id: row.id,
    kind: row.kind,
    text: row.text,
    owner: row.owner,
    category: row.category,
    status: row.status,
    progress: row.progress,
    history: row.history,
    createdSessionId: row.createdSessionId,
  };
}

export interface TrackersService {
  listForPerson(orgId: string, managerId: string, personId: string, opts?: { includeArchived?: boolean }): Promise<GroupedTrackers>;
  create(orgId: string, managerId: string, personId: string, input: {
    kind?: unknown; text?: unknown; owner?: unknown; category?: unknown; status?: unknown; progress?: unknown; note?: unknown; sessionId?: unknown; createdByUserId?: string | null;
  }): Promise<TrackerView>;
  update(orgId: string, managerId: string, itemId: string, patch: { status?: unknown; progress?: unknown; note?: unknown }): Promise<TrackerView>;
  /** Called by guided complete(): apply the Catch-up promise outcomes to the tracker rows.
   *  { itemId: "yes"|"partly"|"no"|"changed" }. Silently skips ids the caller doesn't own or
   *  that aren't open promises (defensive — a stale client id must never 500 a completion). */
  applyPromiseOutcomes(orgId: string, managerId: string, outcomes: Record<string, string>): Promise<number>;
}

export function createTrackersService(deps: {
  repo: TrackersRepo;
  people: Pick<PeopleRepo, "findForManager">;
}): TrackersService {
  const { repo, people } = deps;

  async function assertOwnsPerson(personId: string, orgId: string, managerId: string): Promise<void> {
    const person = await people.findForManager(personId, orgId, managerId);
    if (!person) throw notFound("Person not found");
  }

  // Resolve the caller's own item (org-fenced) then re-check they manage its person.
  async function own(itemId: string, orgId: string, managerId: string): Promise<TrackerItemRow> {
    const row = await repo.findForOrg(itemId, orgId);
    if (!row) throw notFound("Tracker item not found");
    await assertOwnsPerson(row.personId, orgId, managerId);
    return row;
  }

  function event(text: string): TrackerHistoryEvent {
    return { at: new Date().toISOString(), text };
  }

  return {
    async listForPerson(orgId, managerId, personId, opts) {
      await assertOwnsPerson(personId, orgId, managerId);
      const rows = await repo.listForPerson(personId, orgId);
      const includeArchived = !!opts?.includeArchived;
      const grouped: GroupedTrackers = { promises: [], requests: [], goals: [] };
      for (const row of rows) {
        const v = toView(row);
        if (row.kind === "promise") {
          // Catch-up only surfaces OPEN promises (a resolved outcome drops off next meeting).
          if (includeArchived || row.status === "open") grouped.promises.push(v);
        } else if (row.kind === "request") {
          // Resolved requests leave the default list (still reachable with includeArchived).
          if (includeArchived || row.status !== "resolved") grouped.requests.push(v);
        } else if (row.kind === "goal") {
          // Goals stay listed even when done (the trend matters) — no default filter.
          grouped.goals.push(v);
        }
      }
      // Manager's OWN promises first in the Catch-up (per the prototype).
      grouped.promises.sort((a, b) => (a.owner === "manager" ? -1 : 1) - (b.owner === "manager" ? -1 : 1));
      return grouped;
    },

    async create(orgId, managerId, personId, input) {
      await assertOwnsPerson(personId, orgId, managerId);
      if (!isKind(input.kind)) throw badRequest("kind must be promise, request or goal");
      const kind = input.kind;
      const text = String(input.text ?? "").trim();
      if (!text) throw badRequest("text is required");

      const owner = kind === "promise" ? (OWNERS.includes(String(input.owner)) ? String(input.owner) : "manager") : null;
      const category = kind === "request" ? (CATEGORIES.includes(String(input.category)) ? String(input.category) : "growth_development") : null;
      // 0 (not null) for non-goals — a parallel session created tracker_items with
      // progress NOT NULL on the shared local DB; 0 is safe on both a nullable and a
      // NOT NULL column, and non-goals never display progress anyway.
      const progress = kind === "goal" ? clampProgress(input.progress) : 0;
      // Honour a valid initial status (the add-goal panel offers one); else the per-kind default.
      const status = STATUS_BY_KIND[kind].includes(String(input.status)) ? String(input.status) : DEFAULT_STATUS[kind];

      const note = typeof input.note === "string" ? input.note.trim() : "";
      const history: TrackerHistoryEvent[] = [event(note || "Raised")];

      const row = await repo.insert({
        orgId,
        personId,
        createdByUserId: input.createdByUserId ?? managerId,
        kind,
        text,
        owner,
        category,
        status,
        progress,
        history,
        createdSessionId: typeof input.sessionId === "string" ? input.sessionId : null,
      });
      return toView(row);
    },

    async update(orgId, managerId, itemId, patch) {
      const row = await own(itemId, orgId, managerId);
      const kind = row.kind as TrackerKind;
      const set: { status?: string; progress?: number | null; history?: TrackerHistoryEvent[] } = {};
      const history = [...row.history];
      const note = typeof patch.note === "string" ? patch.note.trim() : "";

      let statusChanged = false;
      if (patch.status !== undefined) {
        const status = String(patch.status);
        if (!STATUS_BY_KIND[kind].includes(status)) throw badRequest(`Invalid status "${status}" for a ${kind}`);
        if (status !== row.status) { set.status = status; statusChanged = true; }
      }
      let progressChanged = false;
      if (patch.progress !== undefined && kind === "goal") {
        const p = clampProgress(patch.progress);
        if (p !== row.progress) { set.progress = p; progressChanged = true; }
      }

      // One history event per update — the note wins; otherwise synthesize the change.
      if (note) history.push(event(note));
      else if (statusChanged) history.push(event(`Marked ${STATUS_LABEL[set.status!] ?? set.status}`));
      else if (progressChanged) history.push(event(`Progress updated to ${set.progress}%`));

      if (note || statusChanged || progressChanged) {
        set.history = history;
        await repo.update(itemId, set);
      }
      const updated = await own(itemId, orgId, managerId);
      return toView(updated);
    },

    async applyPromiseOutcomes(orgId, managerId, outcomes) {
      let applied = 0;
      for (const [itemId, outcome] of Object.entries(outcomes || {})) {
        const status = OUTCOME_TO_STATUS[outcome];
        if (!status) continue; // unknown chip value
        const row = await repo.findForOrg(itemId, orgId);
        if (!row || row.kind !== "promise" || row.status !== "open") continue; // stale / not open / wrong kind
        const person = await people.findForManager(row.personId, orgId, managerId);
        if (!person) continue; // not the caller's to touch
        const history = [...row.history, event(`Marked ${STATUS_LABEL[status] ?? status}`)];
        await repo.update(itemId, { status, history });
        applied += 1;
      }
      return applied;
    },
  };
}

function clampProgress(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
