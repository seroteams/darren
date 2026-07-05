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
  list(orgId: string, managerId: string): Promise<{ people: PersonRow[] }>;
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
}

export function createPeopleService(repo: PeopleRepo = pgPeopleRepo): PeopleService {
  /** The caller's own row or a 404 — the fencing everything else builds on. */
  async function owned(id: string, orgId: string, managerId: string): Promise<PersonRow> {
    const row = await repo.findForManager(id, orgId, managerId);
    if (!row) throw notFound("Person not found");
    return row;
  }

  return {
    async list(orgId, managerId) {
      const rows = await repo.listForManager(orgId, managerId);
      const active = rows
        .filter(isActive)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      return { people: active };
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
  };
}

export const peopleService = createPeopleService();
