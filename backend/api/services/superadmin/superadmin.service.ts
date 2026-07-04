// The superadmin view service (pre-go-live PG6 + PG7) — the read-only, cross-company
// picture Carl uses to watch the alpha. Read-only by construction: it imports only the
// read repo and exposes no mutation. It shapes the reads (companies, users, runs) into
// "every company and the people in it", oldest-first, no secrets — now with the PG7
// return-visit signal (per-user run counts + last-active) and an alpha-wide rating summary.

import { pgSuperadminRepo } from "./superadmin.repo.ts";
import type { SuperadminRepo, RunRow } from "./superadmin.repo.ts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

export function createSuperadminService(repo: SuperadminRepo = pgSuperadminRepo): SuperadminService {
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
  };
}

export const superadminService = createSuperadminService();
