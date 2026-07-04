// The superadmin view service (pre-go-live PG6 + PG7) — the read-only, cross-company
// picture Carl uses to watch the alpha. Read-only by construction: it imports only the
// read repo and exposes no mutation. It shapes three reads (companies, users, run signals)
// into "every company and the people in it", oldest-first, each user carrying the
// return-visit signal (run count, last active, this-week / last-week), plus an alpha-wide
// rating summary. No secrets, no run content — just the numbers.

import { pgSuperadminRepo } from "./superadmin.repo.ts";
import type { SuperadminRepo, RunSignal } from "./superadmin.repo.ts";

/** A person as the superadmin view shows them — no passwordHash, no internal orgId. The
 *  return-visit signal (PG7) is derived from run timestamps + PG3 ratings. */
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

/** A company with the people in it. */
export interface RegisteredCompany {
  id: string;
  name: string;
  createdAt: Date;
  users: RegisteredUser[];
}

/** The one-glance alpha read (PG7): mean stars over rated runs, how many were rated, and
 *  how many landed low (≤2). Alpha-wide — folds every rating across every company. */
export interface AlphaSummary {
  avgStars: number | null;
  ratedCount: number;
  lowCount: number;
}

export interface SuperadminService {
  /** Every company and its users (companies + users oldest-first), each user with the
   *  return-visit signal, plus the alpha rating summary. `now` is injected so the
   *  this-week / last-week buckets are deterministic (the service never reads the clock). */
  listRegistered(now: Date): Promise<{ companies: RegisteredCompany[]; summary: AlphaSummary }>;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LOW_STARS = 2; // a rating of 2 or below is a "low score"

/** The return-visit signal for one user's runs, against a fixed reference clock. */
function userStats(runs: RunSignal[], now: number) {
  const thisWeekStart = now - WEEK_MS;
  const lastWeekStart = now - 2 * WEEK_MS;
  let lastActive = 0;
  let runsThisWeek = 0;
  let runsLastWeek = 0;
  for (const r of runs) {
    if (r.lastSeenAt > lastActive) lastActive = r.lastSeenAt;
    if (r.lastSeenAt > thisWeekStart) runsThisWeek++;
    else if (r.lastSeenAt > lastWeekStart) runsLastWeek++;
  }
  return {
    runCount: runs.length,
    lastActiveAt: lastActive > 0 ? new Date(lastActive) : null,
    runsThisWeek,
    runsLastWeek,
  };
}

/** Fold every rating (across all companies) into the one-glance alpha summary. */
function alphaSummary(signals: RunSignal[]): AlphaSummary {
  const rated = signals.filter((s): s is RunSignal & { stars: number } => s.stars != null);
  if (rated.length === 0) return { avgStars: null, ratedCount: 0, lowCount: 0 };
  const total = rated.reduce((sum, s) => sum + s.stars, 0);
  return {
    avgStars: total / rated.length,
    ratedCount: rated.length,
    lowCount: rated.filter((s) => s.stars <= LOW_STARS).length,
  };
}

export function createSuperadminService(repo: SuperadminRepo = pgSuperadminRepo): SuperadminService {
  return {
    async listRegistered(now: Date) {
      const [orgs, people, signals] = await Promise.all([
        repo.listOrganizations(),
        repo.listUsers(),
        repo.listRunSignals(),
      ]);
      const nowMs = now.getTime();
      const oldestFirst = (a: { createdAt: Date }, b: { createdAt: Date }) =>
        a.createdAt.getTime() - b.createdAt.getTime();

      // Bucket run signals by the user who ran them (anonymous runs attach to no user, but
      // still count toward the alpha summary below).
      const signalsByUser = new Map<string, RunSignal[]>();
      for (const s of signals) {
        if (!s.userId) continue;
        const list = signalsByUser.get(s.userId) ?? [];
        list.push(s);
        signalsByUser.set(s.userId, list);
      }

      // Bucket users by company. Sort the flat list first, so each company's list comes
      // out oldest-first too (this service owns the ordering, not the repo).
      const byOrg = new Map<string, RegisteredUser[]>();
      for (const u of [...people].sort(oldestFirst)) {
        const list = byOrg.get(u.orgId) ?? [];
        list.push({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          ...userStats(signalsByUser.get(u.id) ?? [], nowMs),
        });
        byOrg.set(u.orgId, list);
      }
      const companies: RegisteredCompany[] = [...orgs].sort(oldestFirst).map((o) => ({
        id: o.id,
        name: o.name,
        createdAt: o.createdAt,
        users: byOrg.get(o.id) ?? [],
      }));
      return { companies, summary: alphaSummary(signals) };
    },
  };
}

export const superadminService = createSuperadminService();
