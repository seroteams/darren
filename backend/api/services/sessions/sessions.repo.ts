// Storage seam for the live 1:1 runner — the one interface every sessions service
// depends on for live + on-disk session state. Phase 004 step 3, sub-phase S0: the
// seam is defined here BEFORE any route moves, so S1–S4 convert mechanically against
// a stable boundary. A DB- or Redis-backed store can replace `fileSessionsRepo`
// without touching a service.
//
// Scope: STORAGE ONLY (read/create/drop/persist the session record). The pure
// derivations the handlers also share — snapshot / inferStage / summarizeAxes — take
// a Session and compute a view; they touch no storage, so they are NOT on this repo.
// They move into the sessions service alongside their routes (snapshot→rehydrate,
// inferStage→preview) in S1, keeping "repos own data access" honest.
//
// S0 moves no routes: this delegates to the existing `sessions.ts` store, which the
// legacy handlers still call directly until their route is converted.

import {
  getSession,
  createWebSession,
  dropSession,
  persistSession,
} from "../../sessions.ts";
import type { Session, MeetingContext } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";

export interface SessionsRepo {
  /** Live-or-restore-from-disk read; undefined when no such session exists. */
  get(id: string): Session | undefined;
  /** Create a new live session (throws 503 at the concurrency cap, as today). */
  create(ctx: MeetingContext, introQueue: Question[]): Session;
  /** Evict a session from the live store (on-disk record is left in place). */
  drop(id: string): void;
  /** Write the session's current state to disk. */
  persist(session: Session): void;
}

export const fileSessionsRepo: SessionsRepo = {
  get: (id) => getSession(id),
  create: (ctx, introQueue) => createWebSession(ctx, introQueue),
  drop: (id) => {
    dropSession(id);
  },
  persist: (session) => {
    persistSession(session);
  },
};
