// The superadmin view service (pre-go-live PG6 + PG7) — the cross-company picture Carl uses
// to watch the alpha. Almost entirely read-only: it shapes the reads (companies, users, runs)
// into "every company and the people in it", oldest-first, no secrets, with the PG7 return-visit
// signal and an alpha-wide rating summary. The ONE mutation is setUserRole (user-management
// Phase 2) — validation, the "never orphan a company" guardrail, and the audit all live here,
// so the controller stays thin and the repo write can't be reached un-guarded.

import { pgSuperadminRepo } from "./superadmin.repo.ts";
import type { SuperadminRepo, RunRow, UserRunRow, SuperadminRunDetail, UserRoleName } from "./superadmin.repo.ts";
import { badRequest, notFound, conflict } from "../../middleware/http-error.ts";
import { appendSuperadminAudit } from "../../middleware/superadmin-audit.ts";
import type { SuperadminAuditEntry } from "../../middleware/superadmin-audit.ts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The account roles a superadmin may set. */
const ROLES: readonly UserRoleName[] = ["admin", "manager", "member"];
/** "Lead" = a manager/admin who can run the company. Deactivation (Phase 3) will refine
 *  this; today every manager/admin counts. */
function isLead(role: string): boolean {
  return role === "manager" || role === "admin";
}

/** Who is performing a mutation — for the audit trail. */
export interface SuperadminActor {
  userId: string | null;
  email: string | null;
}
/** How a mutation records its outcome. Injectable so tests assert the trail without disk. */
export type SuperadminAudit = (entry: SuperadminAuditEntry) => Promise<void>;

/** A person as the superadmin view shows them — no passwordHash, no internal orgId.
 *  The run fields (PG7) answer "are they coming back?": total runs, when last active,
 *  and this-week / last-week counts. Zeros (not omission) for a user who hasn't run. */
export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  runCount: number;
  lastActiveAt: Date | null;
  runsThisWeek: number;
  runsLastWeek: number;
}

/** The alpha-wide rating signal (PG7): average stars, how many runs were rated, and how
 *  many landed low (≤2) — folded over every run in the alpha. avgStars is null when
 *  nothing has been rated yet. */
export interface AlphaSummary {
  avgStars: number | null;
  ratedCount: number;
  lowCount: number;
}

/** A company with the people in it. */
export interface RegisteredCompany {
  id: string;
  name: string;
  createdAt: Date;
  users: RegisteredUser[];
}

export interface SuperadminService {
  /** Every company and its users (companies + users oldest-first), each user carrying
   *  their return-visit signal, plus the alpha-wide rating summary. `now` is injected so
   *  the week buckets are deterministic in tests; it defaults to the current time. */
  listRegistered(now?: Date): Promise<{ companies: RegisteredCompany[]; summary: AlphaSummary }>;
  /** One user's finished runs, newest-first (PG8 drilldown). Read-only, superadmin-only. */
  userRuns(userId: string): Promise<{ runs: UserRunRow[] }>;
  /** One finished run's read-only briefing detail (PG8 Step 3). null if unknown/unfinished. */
  runDetail(runId: string): Promise<SuperadminRunDetail | null>;
  /** Set a user's account role (user-management Phase 2). Validates the role, blocks a change
   *  that would leave a company with no manager/admin, writes it, and audits the outcome.
   *  Throws 400 (bad role), 404 (unknown user), or 409 (last lead). */
  setUserRole(actor: SuperadminActor, userId: string, role: string): Promise<{ id: string; role: UserRoleName }>;
}

/** Per-user run tallies, keyed by userId. Runs with no userId (machine/gate sessions)
 *  never enter here — they belong to no registered person. */
function tallyRunsByUser(runs: RunRow[], nowMs: number) {
  const byUser = new Map<string, { count: number; lastActive: number; thisWeek: number; lastWeek: number }>();
  for (const r of runs) {
    if (!r.userId) continue;
    const t = byUser.get(r.userId) ?? { count: 0, lastActive: 0, thisWeek: 0, lastWeek: 0 };
    t.count += 1;
    if (r.lastSeenAt > t.lastActive) t.lastActive = r.lastSeenAt;
    const age = nowMs - r.lastSeenAt;
    if (age >= 0 && age < WEEK_MS) t.thisWeek += 1;
    else if (age >= WEEK_MS && age < 2 * WEEK_MS) t.lastWeek += 1;
    byUser.set(r.userId, t);
  }
  return byUser;
}

/** Fold every run's rating into the one alpha-wide summary. */
function summarizeRatings(runs: RunRow[]): AlphaSummary {
  const rated = runs.filter((r) => typeof r.stars === "number") as (RunRow & { stars: number })[];
  if (rated.length === 0) return { avgStars: null, ratedCount: 0, lowCount: 0 };
  const total = rated.reduce((sum, r) => sum + r.stars, 0);
  return {
    avgStars: Math.round((total / rated.length) * 10) / 10,
    ratedCount: rated.length,
    lowCount: rated.filter((r) => r.stars <= 2).length,
  };
}

export function createSuperadminService(
  repo: SuperadminRepo = pgSuperadminRepo,
  audit: SuperadminAudit = appendSuperadminAudit,
): SuperadminService {
  return {
    async listRegistered(now = new Date()) {
      const [orgs, people, runs] = await Promise.all([
        repo.listOrganizations(),
        repo.listUsers(),
        repo.listRuns(),
      ]);
      const nowMs = now.getTime();
      const runsByUser = tallyRunsByUser(runs, nowMs);
      const oldestFirst = (a: { createdAt: Date }, b: { createdAt: Date }) =>
        a.createdAt.getTime() - b.createdAt.getTime();
      // Bucket users by company. Sort the flat list first, so each company's list comes
      // out oldest-first too (this service owns the ordering, not the repo).
      const byOrg = new Map<string, RegisteredUser[]>();
      for (const u of [...people].sort(oldestFirst)) {
        const t = runsByUser.get(u.id);
        const list = byOrg.get(u.orgId) ?? [];
        list.push({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          runCount: t?.count ?? 0,
          lastActiveAt: t ? new Date(t.lastActive) : null,
          runsThisWeek: t?.thisWeek ?? 0,
          runsLastWeek: t?.lastWeek ?? 0,
        });
        byOrg.set(u.orgId, list);
      }
      const companies: RegisteredCompany[] = [...orgs].sort(oldestFirst).map((o) => ({
        id: o.id,
        name: o.name,
        createdAt: o.createdAt,
        users: byOrg.get(o.id) ?? [],
      }));
      return { companies, summary: summarizeRatings(runs) };
    },
    async userRuns(userId) {
      const runs = await repo.listRunsForUser(userId);
      return { runs: [...runs].sort((a, b) => b.lastSeenAt - a.lastSeenAt) };
    },
    async runDetail(runId) {
      return repo.readRun(runId);
    },
    async setUserRole(actor, userId, role) {
      const route = `/api/v1/admin/users/${userId}/role`;
      const rec = (outcome: "success" | "blocked" | "failed", detail: string) =>
        audit({
          at: new Date().toISOString(),
          userId: actor.userId,
          email: actor.email,
          method: "PATCH",
          route,
          outcome,
          target: userId,
          detail,
        });

      if (!ROLES.includes(role as UserRoleName)) {
        await rec("failed", `invalid role: ${String(role)}`);
        throw badRequest("Role must be one of admin, manager, or member.");
      }
      const people = await repo.listUsers();
      const target = people.find((u) => u.id === userId);
      if (!target) {
        await rec("failed", "unknown user");
        throw notFound("unknown user");
      }
      // Never leave a company without at least one manager/admin: block demoting its last lead.
      if (isLead(target.role) && role === "member") {
        const leads = people.filter((u) => u.orgId === target.orgId && isLead(u.role));
        if (leads.length <= 1) {
          await rec("blocked", `last manager/admin of the company (was ${target.role})`);
          throw conflict(
            "This is the company's only manager or admin — promote someone else first, then change this one.",
          );
        }
      }
      await repo.updateUserRole(userId, role as UserRoleName);
      await rec("success", `role ${target.role}→${role}`);
      return { id: userId, role: role as UserRoleName };
    },
  };
}

export const superadminService = createSuperadminService();
