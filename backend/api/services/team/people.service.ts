// The people-roster service (people-roster Phase 1). Owns the roster rules — dedupe on
// a normalized name, merge-as-pointer with chain collapse (same idea as the alias files
// in team.service.ts), archive as a stamp. Every op is fenced to the caller's orgId +
// managerId; a miss answers "not found", never "forbidden" (don't confirm the row exists).

import { pgPeopleRepo } from "./people.repo.ts";
import type { PeopleRepo, PersonRow } from "./people.repo.ts";
import { badRequest, notFound } from "../../middleware/http-error.ts";

/** A roster person's login-access state, shown on the Team card (team-page-redesign Phase 3). */
export type PersonAccessState = "joined" | "opened" | "invited" | "none";
export interface PersonAccess {
  state: PersonAccessState;
  inviteId: string | null;
  invitedAt: number | null; // epoch ms — the card shows "Invited Nd ago"
  openedAt: number | null;
}

/** Derive the access state: a linked account = joined; else a pending invite that's been opened
 *  = opened, un-opened = invited; else no access. Pure so the card logic is unit-tested. */
export function accessFor(
  person: { userId: string | null },
  invite: { inviteId: string; invitedAt: Date; openedAt: Date | null } | undefined,
): PersonAccess {
  if (person.userId) return { state: "joined", inviteId: null, invitedAt: null, openedAt: null };
  if (invite)
    return {
      state: invite.openedAt ? "opened" : "invited",
      inviteId: invite.inviteId,
      invitedAt: invite.invitedAt.getTime(),
      openedAt: invite.openedAt ? invite.openedAt.getTime() : null,
    };
  return { state: "none", inviteId: null, invitedAt: null, openedAt: null };
}

export type PersonWithAccess = PersonRow & { access: PersonAccess };

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
  list(orgId: string, managerId: string): Promise<{ people: PersonWithAccess[] }>;
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
  /** Hard delete (people-roster): permanently remove the person AND all their content —
   *  every 1:1 run about them, its artifacts, and any pending invite. Irreversible,
   *  fenced to the caller's own row (404 otherwise). The cascade lives in the repo. */
  remove(id: string, orgId: string, managerId: string): Promise<{ ok: true }>;
  /** Link a roster person to a member account (people-roster Phase 5). The target must
   *  be a login account in the SAME org — anything else is a 400, never a silent
   *  cross-org link. Unlink clears it (idempotent). */
  link(id: string, orgId: string, managerId: string, targetUserId: string): Promise<{ ok: true }>;
  unlink(id: string, orgId: string, managerId: string): Promise<{ ok: true }>;
  /** The org's login accounts a person can be linked to (id/name/email only). */
  linkableUsers(orgId: string): Promise<{ users: { id: string; name: string; email: string }[] }>;
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
    if (!row) throw notFound("We couldn't find that person — refresh and try again.");
    return row;
  }

  const service: PeopleService = {
    async list(orgId, managerId) {
      const rows = await repo.listForManager(orgId, managerId);
      const active = rows
        .filter(isActive)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      // Attach each person's login-access state (none / invited / opened / joined) for the card.
      const invites = await repo.listPendingInvitesForManager(orgId, managerId);
      const byPerson = new Map(invites.map((i) => [i.personId, i]));
      const people = active.map((p) => ({ ...p, access: accessFor(p, byPerson.get(p.id)) }));
      return { people };
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

    async remove(id, orgId, managerId) {
      const row = await owned(id, orgId, managerId); // fence first — 404, never a blind delete
      await repo.remove(row.id, orgId);
      return { ok: true };
    },

    async link(id, orgId, managerId, targetUserId) {
      const row = await owned(id, orgId, managerId);
      if (!targetUserId) throw badRequest("userId is required");
      const orgUsers = await repo.listOrgUsers(orgId);
      if (!orgUsers.some((u) => u.id === targetUserId)) {
        throw badRequest("That account is not in your company"); // unknown user answers the same
      }
      await repo.update(row.id, { userId: targetUserId });
      return { ok: true };
    },

    async unlink(id, orgId, managerId) {
      const row = await owned(id, orgId, managerId);
      await repo.update(row.id, { userId: null });
      return { ok: true };
    },

    async linkableUsers(orgId) {
      return { users: await repo.listOrgUsers(orgId) };
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
