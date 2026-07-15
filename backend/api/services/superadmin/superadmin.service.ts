// The superadmin view service (pre-go-live PG6 + PG7) — the cross-company picture Carl uses
// to watch the alpha. Almost entirely read-only: it shapes the reads (companies, users, runs)
// into "every company and the people in it", oldest-first, no secrets, with the PG7 return-visit
// signal and an alpha-wide rating summary. The ONE mutation is setUserRole (user-management
// Phase 2) — validation, the "never orphan a company" guardrail, and the audit all live here,
// so the controller stays thin and the repo write can't be reached un-guarded.

import { pgSuperadminRepo } from "./superadmin.repo.ts";
import type { SuperadminRepo, RunRow, UserRunRow, SuperadminRunDetail, UserRoleName, PulseRunRow, AdminRunRow } from "./superadmin.repo.ts";
import { badRequest, notFound, conflict } from "../../middleware/http-error.ts";
import { isSuperadminEmail } from "../../middleware/require-auth.ts";
import { appendSuperadminAudit } from "../../middleware/superadmin-audit.ts";
import type { SuperadminAuditEntry } from "../../middleware/superadmin-audit.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
/** "Came back" = a second prep within this window of the first (validation-kit Phase 2). */
const CAME_BACK_MS = 14 * DAY_MS;
/** Internal accounts (Carl + test) — labelled so real testers stand out in the view. */
const INTERNAL_DOMAIN = "@seroteams.com";
function isInternalAccount(email: string): boolean {
  return email.toLowerCase().endsWith(INTERNAL_DOMAIN) || isSuperadminEmail(email);
}

/** The account roles a superadmin may set. */
const ROLES: readonly UserRoleName[] = ["admin", "manager", "member"];
/** "Lead" = a manager/admin who can run the company. */
function isLead(role: string): boolean {
  return role === "manager" || role === "admin";
}
/** An *active* lead — the invariant we protect is "never leave a company with no active
 *  manager/admin". A deactivated lead doesn't count (Phase 3). */
function isActiveLead(u: { role: string; deactivatedAt?: Date | null }): boolean {
  return isLead(u.role) && !u.deactivatedAt;
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
  /** The return signal (validation-kit Phase 2): when their first run started, the days
   *  between run 1 and run 2 (null until a second run), and whether that second run came
   *  within 14 days — the validation-stage pass bar. */
  firstRunAt: Date | null;
  gapDays: number | null;
  cameBack: boolean;
  /** True for Carl + test accounts (superadmin or @seroteams.com) — labelled in the view
   *  so real testers stand out. */
  internal: boolean;
  /** Deactivate/reactivate (Phase 3): true = switched off (login blocked). Drives the
   *  "Deactivated" row state on the User management screen. */
  deactivated: boolean;
}

/** The alpha-wide rating signal (PG7): average stars, how many runs were rated, and how
 *  many landed low (≤2) — folded over every run in the alpha. avgStars is null when
 *  nothing has been rated yet. */
export interface AlphaSummary {
  avgStars: number | null;
  ratedCount: number;
  lowCount: number;
}

/** One external manager row on the Pulse dashboard (admin-live-deploy Phase 3) — the
 *  came-back signal at a glance. A subset of RegisteredUser plus their company name. */
export interface PulseManager {
  id: string;
  name: string;
  company: string;
  runCount: number;
  lastActiveAt: Date | null;
  firstRunAt: Date | null;
  cameBack: boolean;
  gapDays: number | null;
  /** back = came back within the window · once = ran, not back yet · none = registered, no
   *  runs · internal = a Sero/test account (labelled, excluded from the Gate-1 number). */
  status: "back" | "once" | "none" | "internal";
}

/** The founder Pulse payload (admin-live-deploy Phase 3): one screen's worth of the live site
 *  — the Gate-1 return number, managers, run volume + type mix, drop-offs, guests, errors, and
 *  the latest feedback. Assembled from listRegistered plus the new time-series reads. All
 *  time-series count EXTERNAL managers only (internal Sero runs are excluded); `now` is
 *  injected so the day/week buckets are deterministic in tests. */
export interface PulseData {
  gate1: { cameBack: number; total: number };
  managersOnLive: number;
  managersNewThisWeek: number;
  runsThisWeek: number;
  runsLastWeek: number;
  ratings: AlphaSummary;
  guestCount: number;
  /** Runs per day over the last 14 days, oldest first (index 0 = 13 days ago). */
  runsPerDay: number[];
  /** Meeting-type mix over the last 7 days, most common first. */
  runTypeMix: { type: string; count: number }[];
  /** Where unfinished runs broke off over the last 14 days, by stage. */
  dropOffs: { stage: string; count: number }[];
  errors: { total: number; unresolved: number };
  latestFeedback: { message: string; verdict: string | null; runId: string | null }[];
  managers: PulseManager[];
}

/** One run on the drill-down run list (pulse-drilldowns) — every session on the site,
 *  attributed. `userName`/`company` are null for a guest (ownerless) run; `internal`
 *  labels Sero/test accounts so real managers stand out, mirroring the Pulse rules. */
export interface AdminRunListRow {
  id: string;
  userName: string | null;
  company: string | null;
  internal: boolean;
  guest: boolean;
  meetingType: string | null;
  startedAt: number | null;
  lastSeenAt: number;
  finished: boolean;
  stage: string | null;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
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
  /** The unclaimed guest pile (guest-run Phase 4): ownerless finished runs, newest-first. */
  guestRuns(): Promise<{ runs: UserRunRow[] }>;
  /** One finished run's read-only briefing detail (PG8 Step 3). null if unknown/unfinished. */
  runDetail(runId: string): Promise<SuperadminRunDetail | null>;
  /** The founder Pulse dashboard payload (admin-live-deploy Phase 3) — one screen's worth of
   *  the live site, folding listRegistered with the new time-series reads. `now` is injected
   *  for deterministic buckets in tests; it defaults to the current time. */
  pulse(now?: Date): Promise<PulseData>;
  /** Every run on the site, attributed and newest-first, for the Pulse drill-down list
   *  pages (pulse-drilldowns). `externalThisWeek` is computed with the SAME rule as the
   *  Pulse "Runs this week" tile, so the page header can never disagree with the card.
   *  `now` is injected for deterministic weeks in tests. */
  adminRuns(now?: Date): Promise<{ runs: AdminRunListRow[]; externalThisWeek: number }>;
  /** Set a user's account role (user-management Phase 2). Validates the role, blocks a change
   *  that would leave a company with no manager/admin, writes it, and audits the outcome.
   *  Throws 400 (bad role), 404 (unknown user), or 409 (last lead). */
  setUserRole(actor: SuperadminActor, userId: string, role: string): Promise<{ id: string; role: UserRoleName }>;
  /** Switch a user off (user-management Phase 3): blocks their login and kills their live
   *  sessions immediately. Guardrails: no deactivating yourself, a superadmin account, or a
   *  company's last active manager/admin. Throws 404 (unknown), 409 (guardrail). Audits. */
  deactivateUser(actor: SuperadminActor, userId: string): Promise<{ id: string; deactivated: true }>;
  /** Switch a user back on (Phase 3) — clears the block so they can log in again. Reversible,
   *  deletes nothing. Throws 404 (unknown). Audits. */
  reactivateUser(actor: SuperadminActor, userId: string): Promise<{ id: string; deactivated: false }>;
  /** Permanently delete a user (user-management Phase 4) — the one irreversible action. Their
   *  finished 1:1s are KEPT under the company but orphaned (no owner); every other reference to
   *  them is cleared so the delete can't fail on a foreign key. Same guardrails as deactivate:
   *  no deleting yourself, a superadmin account, or a company's last active manager/admin.
   *  Throws 404 (unknown), 409 (guardrail). Audits. */
  deleteUser(actor: SuperadminActor, userId: string): Promise<{ id: string; deleted: true }>;
}

/** Per-user run tallies, keyed by userId. Runs with no userId (machine/gate sessions)
 *  never enter here — they belong to no registered person. `first`/`second` are the two
 *  earliest run starts (createdAt, falling back to lastSeenAt on legacy rows) — the
 *  return signal's inputs; Infinity means "not seen yet". */
function tallyRunsByUser(runs: RunRow[], nowMs: number) {
  const byUser = new Map<string, { count: number; lastActive: number; thisWeek: number; lastWeek: number; first: number; second: number }>();
  for (const r of runs) {
    if (!r.userId) continue;
    const t = byUser.get(r.userId) ?? { count: 0, lastActive: 0, thisWeek: 0, lastWeek: 0, first: Infinity, second: Infinity };
    t.count += 1;
    if (r.lastSeenAt > t.lastActive) t.lastActive = r.lastSeenAt;
    const age = nowMs - r.lastSeenAt;
    if (age >= 0 && age < WEEK_MS) t.thisWeek += 1;
    else if (age >= WEEK_MS && age < 2 * WEEK_MS) t.lastWeek += 1;
    const started = r.createdAt && r.createdAt > 0 ? r.createdAt : r.lastSeenAt;
    if (started > 0) {
      if (started < t.first) { t.second = t.first; t.first = started; }
      else if (started < t.second) t.second = started;
    }
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

const PULSE_DAYS = 14;

/** Bucket the external-manager sessions into the Pulse time-series (admin-live-deploy Phase 3):
 *  runs per day (last 14d, oldest first), meeting-type mix (last 7d) and where unfinished runs
 *  broke off (last 14d, by stage). Only runs owned by an external manager count — internal
 *  (Sero) and guest/machine runs are excluded. `nowMs` fixes the day boundaries for tests. */
function bucketPulseRuns(runs: PulseRunRow[], externalUserIds: Set<string>, nowMs: number) {
  const runsPerDay = new Array(PULSE_DAYS).fill(0) as number[];
  const typeMix = new Map<string, number>();
  const dropOffs = new Map<string, number>();
  for (const r of runs) {
    if (!r.userId || !externalUserIds.has(r.userId)) continue; // external managers only
    if (r.createdAtMs == null) continue;
    const age = nowMs - r.createdAtMs;
    if (age < 0) continue;
    const dayIdx = Math.floor(age / DAY_MS);
    if (dayIdx < PULSE_DAYS) {
      const i = PULSE_DAYS - 1 - dayIdx; // oldest first
      runsPerDay[i] = (runsPerDay[i] ?? 0) + 1;
    }
    if (age < WEEK_MS) {
      const type = (r.meetingType && r.meetingType.trim()) || "Other";
      typeMix.set(type, (typeMix.get(type) ?? 0) + 1);
    }
    if (dayIdx < PULSE_DAYS && !r.finished) {
      const stage = (r.stage && r.stage.trim()) || "—";
      dropOffs.set(stage, (dropOffs.get(stage) ?? 0) + 1);
    }
  }
  const desc = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return {
    runsPerDay,
    runTypeMix: desc(typeMix).map(([type, count]) => ({ type, count })),
    dropOffs: desc(dropOffs).map(([stage, count]) => ({ stage, count })),
  };
}

export function createSuperadminService(
  repo: SuperadminRepo = pgSuperadminRepo,
  audit: SuperadminAudit = appendSuperadminAudit,
): SuperadminService {
  const service: SuperadminService = {
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
        const gapMs = t && Number.isFinite(t.second) ? t.second - t.first : null;
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
          firstRunAt: t && Number.isFinite(t.first) ? new Date(t.first) : null,
          gapDays: gapMs === null ? null : Math.round(gapMs / DAY_MS),
          cameBack: gapMs !== null && gapMs <= CAME_BACK_MS,
          internal: isInternalAccount(u.email),
          deactivated: !!u.deactivatedAt,
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
    async guestRuns() {
      const runs = await repo.listGuestRuns();
      return { runs: [...runs].sort((a, b) => b.lastSeenAt - a.lastSeenAt) };
    },
    async runDetail(runId) {
      return repo.readRun(runId);
    },
    async pulse(now = new Date()) {
      const nowMs = now.getTime();
      const weekAgoMs = nowMs - WEEK_MS;
      const [{ companies, summary }, pulseRuns, guests, errors, feedback] = await Promise.all([
        service.listRegistered(now), // reuse — managers, came-back signal, ratings summary
        repo.listPulseRuns(),
        repo.listGuestRuns(),
        repo.countRecentErrors(weekAgoMs),
        repo.latestFeedback(3),
      ]);
      // Walk the external (non-internal) users once: collect the manager rows, the set of
      // external user ids (so the time-series can drop internal + guest runs), the week run
      // totals (summed from the SAME per-user tallies the User-management screen shows, so the
      // numbers can't disagree), and how many managers registered this week.
      const managers: PulseManager[] = [];
      const externalUserIds = new Set<string>();
      let runsThisWeek = 0, runsLastWeek = 0, managersNewThisWeek = 0;
      for (const co of companies) {
        for (const u of co.users) {
          if (u.internal) continue;
          externalUserIds.add(u.id);
          runsThisWeek += u.runsThisWeek;
          runsLastWeek += u.runsLastWeek;
          if (!isLead(u.role)) continue;
          if (u.createdAt.getTime() >= weekAgoMs) managersNewThisWeek += 1;
          managers.push({
            id: u.id, name: u.name, company: co.name,
            runCount: u.runCount, lastActiveAt: u.lastActiveAt, firstRunAt: u.firstRunAt,
            cameBack: u.cameBack, gapDays: u.gapDays,
            status: u.cameBack ? "back" : u.runCount > 0 ? "once" : "none",
          });
        }
      }
      // Gate 1: of the external managers who actually ran at least once, how many came back.
      const tried = managers.filter((m) => m.runCount > 0);
      const buckets = bucketPulseRuns(pulseRuns, externalUserIds, nowMs);
      return {
        gate1: { cameBack: tried.filter((m) => m.cameBack).length, total: tried.length },
        managersOnLive: managers.length,
        managersNewThisWeek,
        runsThisWeek,
        runsLastWeek,
        ratings: summary,
        guestCount: guests.length,
        runsPerDay: buckets.runsPerDay,
        runTypeMix: buckets.runTypeMix,
        dropOffs: buckets.dropOffs,
        errors,
        latestFeedback: feedback.map((f) => ({ message: f.message, verdict: f.verdict, runId: f.runId })),
        managers,
      };
    },
    async adminRuns(now = new Date()) {
      const nowMs = now.getTime();
      const [rows, people, orgs, tileRuns] = await Promise.all([
        repo.listAdminRuns(),
        repo.listUsers(),
        repo.listOrganizations(),
        repo.listRuns(), // the tile's own dataset — the week count must use its rule
      ]);
      const orgNames = new Map(orgs.map((o) => [o.id, o.name]));
      const userById = new Map(people.map((u) => [u.id, u]));
      // The Pulse tile's runsThisWeek = external users' this-week tallies over listRuns.
      // Recompute it here identically so the list header reconciles with the card.
      let externalThisWeek = 0;
      for (const [uid, t] of tallyRunsByUser(tileRuns, nowMs)) {
        const u = userById.get(uid);
        if (u && !isInternalAccount(u.email)) externalThisWeek += t.thisWeek;
      }
      const runs: AdminRunListRow[] = rows
        .map((r) => {
          const u = r.userId ? userById.get(r.userId) : undefined;
          return {
            id: r.id,
            userName: u?.name ?? null,
            company: (u ? orgNames.get(u.orgId) : r.orgId ? orgNames.get(r.orgId) : undefined) ?? null,
            internal: u ? isInternalAccount(u.email) : false,
            guest: !u,
            meetingType: r.meetingType,
            startedAt: r.createdAtMs,
            lastSeenAt: r.lastSeenAtMs,
            finished: r.finished,
            stage: r.stage,
            rating: r.rating,
          };
        })
        .sort((a, b) => (b.startedAt ?? b.lastSeenAt) - (a.startedAt ?? a.lastSeenAt));
      return { runs, externalThisWeek };
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
      // Never leave a company without at least one *active* manager/admin: block demoting its last lead.
      if (isActiveLead(target) && role === "member") {
        const leads = people.filter((u) => u.orgId === target.orgId && isActiveLead(u));
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

    async deactivateUser(actor, userId) {
      const route = `/api/v1/admin/users/${userId}/deactivate`;
      const rec = auditFor(audit, actor, route, userId);

      const people = await repo.listUsers();
      const target = people.find((u) => u.id === userId);
      if (!target) {
        await rec("failed", "unknown user");
        throw notFound("unknown user");
      }
      // Guardrail 1 — never lock yourself out.
      if (actor.userId && actor.userId === userId) {
        await rec("blocked", "self-deactivate");
        throw conflict("You can't deactivate your own account.");
      }
      // Guardrail 2 — a superadmin account is off-limits (they run the console).
      if (isSuperadminEmail(target.email)) {
        await rec("blocked", "superadmin account");
        throw conflict("This is a superadmin account and can't be deactivated.");
      }
      // Guardrail 3 — never leave a company with no active manager/admin.
      if (isActiveLead(target)) {
        const activeLeads = people.filter((u) => u.orgId === target.orgId && isActiveLead(u));
        if (activeLeads.length <= 1) {
          await rec("blocked", "last active manager/admin of the company");
          throw conflict(
            "This is the company's only active manager or admin — activate or promote someone else first.",
          );
        }
      }
      await repo.setDeactivated(userId, new Date());
      // Kick them NOW: drop every live session so they're bounced on their next action.
      await repo.revokeSessionsForUser(userId);
      await rec("success", `deactivated (was ${target.role})`);
      return { id: userId, deactivated: true };
    },

    async reactivateUser(actor, userId) {
      const route = `/api/v1/admin/users/${userId}/reactivate`;
      const rec = auditFor(audit, actor, route, userId);

      const people = await repo.listUsers();
      const target = people.find((u) => u.id === userId);
      if (!target) {
        await rec("failed", "unknown user");
        throw notFound("unknown user");
      }
      // Reactivation is always safe (it only restores access) — no guardrails.
      await repo.setDeactivated(userId, null);
      await rec("success", "reactivated");
      return { id: userId, deactivated: false };
    },

    async deleteUser(actor, userId) {
      const route = `/api/v1/admin/users/${userId}`;
      const rec = (outcome: "success" | "blocked" | "failed", detail: string) =>
        audit({
          at: new Date().toISOString(),
          userId: actor.userId,
          email: actor.email,
          method: "DELETE",
          route,
          outcome,
          target: userId,
          detail,
        });

      const people = await repo.listUsers();
      const target = people.find((u) => u.id === userId);
      if (!target) {
        await rec("failed", "unknown user");
        throw notFound("unknown user");
      }
      // Same three guardrails as deactivate — delete is only stricter (irreversible).
      if (actor.userId && actor.userId === userId) {
        await rec("blocked", "self-delete");
        throw conflict("You can't delete your own account.");
      }
      if (isSuperadminEmail(target.email)) {
        await rec("blocked", "superadmin account");
        throw conflict("This is a superadmin account and can't be deleted.");
      }
      if (isActiveLead(target)) {
        const activeLeads = people.filter((u) => u.orgId === target.orgId && isActiveLead(u));
        if (activeLeads.length <= 1) {
          await rec("blocked", "last active manager/admin of the company");
          throw conflict(
            "This is the company's only active manager or admin — activate or promote someone else first.",
          );
        }
      }
      // Guardrail 4 (delete-only) — a manager's roster (people.manager_id) is a NOT NULL
      // link, so deleting them would silently wipe their whole team. Refuse until it's empty.
      const roster = await repo.managedRosterCount(userId);
      if (roster > 0) {
        await rec("blocked", `still manages ${roster} roster ${roster === 1 ? "person" : "people"}`);
        throw conflict(
          `This person still manages ${roster} ${roster === 1 ? "person" : "people"} — move or remove their team first.`,
        );
      }
      await repo.deleteUser(userId);
      await rec("success", `deleted (was ${target.role})`);
      return { id: userId, deleted: true };
    },
  };

  return service;
}

/** The audit recorder shared by the Phase 3 mutations — one line per attempt (success /
 *  blocked / failed), stamped with the acting superadmin and the target. */
function auditFor(audit: SuperadminAudit, actor: SuperadminActor, route: string, target: string) {
  return (outcome: "success" | "blocked" | "failed", detail: string) =>
    audit({
      at: new Date().toISOString(),
      userId: actor.userId,
      email: actor.email,
      method: "POST",
      route,
      outcome,
      target,
      detail,
    });
}

export const superadminService = createSuperadminService();
