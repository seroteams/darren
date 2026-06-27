// Storage seam for the live 1:1 runner — the one interface every sessions service
// depends on for live + on-disk session state. Phase 004 step 3, sub-phase S0: the
// seam is defined here BEFORE any route moves, so S1–S4 convert mechanically against
// a stable boundary. A DB- or Redis-backed store can replace `fileSessionsRepo`
// without touching a service.
//
// Scope: the sessions domain's DATA ACCESS. The session record (read/create/drop/
// persist) plus session-adjacent disk state the routes read or write — the cached
// role-profile vocabulary (S1b role-profile) and the per-session eligibility log
// (S1b question). The pure derivations the handlers also share — snapshot /
// inferStage / summarizeAxes — take a Session and compute a view; they touch no
// storage, so they are NOT on this repo. They move into the sessions service
// alongside their routes, keeping "repos own data access" honest.
//
// S0 moved no routes: this delegates to the existing `sessions.ts` store, which the
// legacy handlers still call directly until their route is converted.

import path from "node:path";
import {
  getSession,
  createWebSession,
  dropSession,
  persistSession,
} from "../../sessions.ts";
import { loadRoleProfile } from "../../../engine/role-profile.ts";
import { appendEligibilityLog } from "../../../engine/question-eligibility.ts";
import type { Session, MeetingContext } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";

/** The cached role-profile doc (or null when none is cached) — exactly what the
 *  engine's loadRoleProfile returns, named here so services + tests can refer to it. */
export type RoleProfileDoc = ReturnType<typeof loadRoleProfile>;

export interface SessionsRepo {
  /** Live-or-restore-from-disk read; undefined when no such session exists. */
  get(id: string): Session | undefined;
  /** Create a new live session (throws 503 at the concurrency cap, as today). */
  create(ctx: MeetingContext, introQueue: Question[]): Session;
  /** Evict a session from the live store (on-disk record is left in place). */
  drop(id: string): void;
  /** Write the session's current state to disk. */
  persist(session: Session): void;
  /** Read the cached role-profile vocabulary for a context (role+seniority);
   *  null when nothing is cached (no model call — generated at /start). */
  loadRoleProfile(ctx: MeetingContext): RoleProfileDoc;
  /** Append serve-time eligibility rejections to the session's on-disk log
   *  (log-only; a write failure never breaks a live turn). */
  appendEligibilityLog(dir: string, entries: Parameters<typeof appendEligibilityLog>[1]): void;
}

const ELIGIBILITY_LOG_FILE = "eligibility-log.json";

export const fileSessionsRepo: SessionsRepo = {
  get: (id) => getSession(id),
  create: (ctx, introQueue) => createWebSession(ctx, introQueue),
  drop: (id) => {
    dropSession(id);
  },
  persist: (session) => {
    persistSession(session);
  },
  loadRoleProfile: (ctx) => loadRoleProfile(ctx),
  appendEligibilityLog: (dir, entries) => {
    appendEligibilityLog(path.join(dir, ELIGIBILITY_LOG_FILE), entries);
  },
};
