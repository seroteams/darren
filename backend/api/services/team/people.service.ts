// The people-roster service (people-roster Phase 1). Owns the roster rules — dedupe on
// a normalized name, merge-as-pointer with chain collapse (same idea as the alias files
// in team.service.ts), archive as a stamp. Every op is fenced to the caller's orgId +
// managerId; a miss answers "not found", never "forbidden" (don't confirm the row exists).

import { pgPeopleRepo } from "./people.repo.ts";
import type { PeopleRepo, PersonRow } from "./people.repo.ts";
import { badRequest, notFound } from "../../middleware/http-error.ts";

const NAME_CAP = 80; // same cap as team.service.ts rename
const FIELD_CAP = 120;

const normalizeKey = (s: unknown): string => String(s ?? "").trim().toLowerCase();

/** Trimmed + capped string, or null when blank/absent. */
function cleanField(v: unknown): string | null {
  const s = String(v ?? "").trim().slice(0, FIELD_CAP);
  return s || null;
}

function cleanName(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw badRequest("name is required");
  return v.trim().slice(0, NAME_CAP);
}

const isActive = (p: PersonRow): boolean => !p.mergedIntoId && !p.archivedAt;

/** Follow the merge chain to the canonical row id (guarded against loops). */
function resolveCanonical(rows: PersonRow[], id: string): string {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let k = id;
  const seen = new Set<string>();
  for (;;) {
    const next = byId.get(k)?.mergedIntoId;
    if (!next || seen.has(k)) return k;
    seen.add(k);
    k = next;
  }
}

export interface PeopleService {
  /** Active roster (merged/archived excluded, name-sorted) plus a resolved id-merges
   *  map (mergedRowId → canonical head id) so clients can fold runs that were stamped
   *  with a since-merged personId onto the right card. */
  list(orgId: string, managerId: string): Promise<{ people: PersonRow[]; merges: Record<string, string> }>;
  create(
    orgId: string,
    managerId: string,
    input: { name: unknown; role?: unknown; seniority?: unknown },
  ): Promise<{ person: PersonRow }>;
  update(
    id: string,
    orgId: string,
    managerId: string,
    input: { name?: unknown; role?: unknown; seniority?: unknown },
  ): Promise<{ person: PersonRow }>;
  merge(id: string, orgId: string, managerId: string, intoId: string): Promise<{ ok: true }>;
  archive(id: string, orgId: string, managerId: string): Promise<{ ok: true }>;
  /** The run→person link (people-roster Phase 2). Explicit personId: must be the
   *  caller's own row (400 otherwise — never a silent cross-link), resolved through
   *  the merge chain. No personId: best-effort auto-match-or-create from the name —
   *  returns null (never throws) when there's no org/user context, no usable name,
   *  or the roster store is unavailable, so a run start can't die on the roster. */
  resolveForRun(
    orgId: string | null | undefined,
    managerId: string | null | undefined,
    input: { personId?: string; name?: unknown; role?: unknown; seniority?: unknown },
  ): Promise<string | null>;
}

export function createPeopleService(repo: PeopleRepo = pgPeopleRepo): PeopleService {
  /** The caller's own row or a 404 — the fencing everything else builds on. */
  async function owned(id: string, orgId: string, managerId: string): Promise<PersonRow> {
    const row = await repo.findForManager(id, orgId, managerId);
    if (!row) throw notFound("Person not found");
    return row;
  }

  const service: PeopleService = {
    async list(orgId, managerId) {
      const rows = await repo.listForManager(orgId, managerId);
      const active = rows
        .filter(isActive)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      const merges: Record<string, string> = {};
      for (const r of rows) {
        if (r.mergedIntoId) merges[r.id] = resolveCanonical(rows, r.id);
      }
      return { people: active, merges };
    },

    async create(orgId, managerId, input) {
      const name = cleanName(input.name);
      const rows = await repo.listForManager(orgId, managerId);
      const key = normalizeKey(name);
      const existing = rows.find((r) => isActive(r) && normalizeKey(r.name) === key);
      if (existing) return { person: existing }; // dedupe — hand back the row we already have
      const person = await repo.insert({
        orgId,
        managerId,
        name,
        role: cleanField(input.role),
        seniority: cleanField(input.seniority),
      });
      return { person };
    },

    async update(id, orgId, managerId, input) {
      const row = await owned(id, orgId, managerId);
      const patch: Partial<Pick<PersonRow, "name" | "role" | "seniority">> = {};
      if (input.name !== undefined) patch.name = cleanName(input.name);
      if (input.role !== undefined) patch.role = cleanField(input.role);
      if (input.seniority !== undefined) patch.seniority = cleanField(input.seniority);
      await repo.update(row.id, patch);
      return { person: { ...row, ...patch } };
    },

    async merge(id, orgId, managerId, intoId) {
      if (!intoId) throw badRequest("intoId is required");
      if (id === intoId) throw badRequest("cannot merge a person into themselves");
      await owned(id, orgId, managerId);
      await owned(intoId, orgId, managerId);

      const rows = await repo.listForManager(orgId, managerId);
      const canonicalInto = resolveCanonical(rows, intoId);
      if (canonicalInto === id) throw badRequest("that merge would create a loop");

      await repo.update(id, { mergedIntoId: canonicalInto });
      // Re-point anyone already folded into `id` so chains collapse to one canonical row.
      for (const r of rows) {
        if (r.id !== id && r.mergedIntoId === id) await repo.update(r.id, { mergedIntoId: canonicalInto });
      }
      return { ok: true };
    },

    async archive(id, orgId, managerId) {
      const row = await owned(id, orgId, managerId);
      await repo.update(row.id, { archivedAt: new Date() });
      return { ok: true };
    },

    async resolveForRun(orgId, managerId, input) {
      if (!orgId || !managerId) return null; // guest/anonymous runs carry no roster link
      if (input.personId) {
        // A tampered or stale explicit id is a hard 400 — but first follow the merge
        // chain so a picker holding a since-merged row still lands on the right person.
        const row = await repo.findForManager(input.personId, orgId, managerId);
        if (!row) throw badRequest("Unknown personId");
        const rows = await repo.listForManager(orgId, managerId);
        return resolveCanonical(rows, row.id);
      }
      if (typeof input.name !== "string" || !input.name.trim()) return null;
      try {
        const { person } = await service.create(orgId, managerId, {
          name: input.name,
          role: input.role,
          seniority: input.seniority,
        });
        return person.id;
      } catch (e) {
        // Best-effort by design: the run must start even if the roster store is down.
        console.warn("[people] auto-link skipped:", e instanceof Error ? e.message : String(e));
        return null;
      }
    },
  };
  return service;
}

export const peopleService = createPeopleService();
