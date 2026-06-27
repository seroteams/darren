// The sessions service core — session resolution every sessions controller will
// share. Never touches req/res or storage: all state access goes through the
// injected SessionsRepo (the S0 seam). S1–S4 add the per-route methods (reads,
// writes, AI routes, streams) onto this same service.
//
// `require` is the layered home of the old store's `requireSession`: a missing
// session is a 404. The message text is kept verbatim so the legacy alias's body is
// byte-identical when its route is converted; v1 wraps it in the shared error shape.

import { notFound } from "../../middleware/http-error.ts";
import type { SessionsRepo } from "./sessions.repo.ts";
import type { Session, MeetingContext } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";

export interface SessionsService {
  get(id: string): Session | undefined;
  require(id: string): Session;
  create(ctx: MeetingContext, introQueue: Question[]): Session;
  drop(id: string): void;
  persist(session: Session): void;
}

export function createSessionsService(repo: SessionsRepo): SessionsService {
  function requireExisting(id: string): Session {
    const s = repo.get(id);
    if (!s) throw notFound(`Unknown session: ${id}`);
    return s;
  }

  return {
    get: (id) => repo.get(id),
    require: requireExisting,
    create: (ctx, introQueue) => repo.create(ctx, introQueue),
    drop: (id) => repo.drop(id),
    persist: (session) => repo.persist(session),
  };
}
