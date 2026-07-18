// Card zero — the promise check-in glue (Promises loop phase 2). Sits between
// the thin controller and the engine's promise-history store halves:
//
//   read:  is this session eligible + what does the prior run still hold open?
//   write: put the manager's taps back onto the PRIOR run (the live in-memory
//          copy when it's still resident — WITHOUT bumping its lastSeenAt, so
//          an old run never jumps to the top of history — else the store row),
//          then stamp the CURRENT session's priorCheckin for phase 3's feed.
//
// Declared facts only (no-inference ruling): a skip writes nothing back, and
// unknown ids / invalid values are rejected, never coerced.

import { sessions as liveSessions } from "../../sessions.ts";
import { sessionsRepo } from "./session-runtime.ts";
import { badRequest } from "../../middleware/http-error.ts";
import {
  priorPromiseRunFor,
  writePromiseOutcomesToStore,
  applyPromiseOutcomes,
} from "../../../engine/promise-history.ts";
import type { PriorPromiseRun, OutcomeTap, PromiseOutcome } from "../../../engine/promise-history.ts";
import type { Session, PriorCheckin } from "../../../shared/session.types.ts";
import { asRecord, asString } from "../../../shared/guards.ts";

const OUTCOMES: ReadonlySet<string> = new Set(["yes", "partly", "no", "changed"]);

/** Injected seams so the glue is testable offline; production callers use defaults. */
export interface CheckinDeps {
  findPrior: typeof priorPromiseRunFor;
  writeToStore: typeof writePromiseOutcomesToStore;
  /** Raw live-map peek — deliberately NOT repo.get, which stamps lastSeenAt. */
  liveSession: (id: string) => Session | undefined;
  persist: (s: Session) => void;
}

const defaultDeps: CheckinDeps = {
  findPrior: priorPromiseRunFor,
  writeToStore: writePromiseOutcomesToStore,
  liveSession: (id) => liveSessions.get(id),
  persist: (s) => sessionsRepo.persist(s),
};

// Card zero only ever shows before question 1 of a real, person-linked run,
// and only once (a stamp — taps or skip — retires it for this session).
export function checkinEligible(session: Session): boolean {
  return (
    session.transcript.length === 0 &&
    session.mode !== "scripted" &&
    !session.priorCheckin &&
    Boolean(session.personId) &&
    Boolean(session.userId)
  );
}

export async function priorPromisesForSession(session: Session, deps: CheckinDeps = defaultDeps): Promise<PriorPromiseRun | null> {
  if (!checkinEligible(session)) return null;
  return deps.findPrior({
    orgId: session.orgId,
    userId: session.userId,
    personId: session.personId,
    excludeId: session.id,
  });
}

export interface RecordResult {
  ok: true;
  skipped: boolean;
  applied: number;
}

export async function recordPromiseOutcomes(
  session: Session,
  body: Record<string, unknown>,
  deps: CheckinDeps = defaultDeps,
): Promise<RecordResult> {
  const fence = { orgId: session.orgId, userId: session.userId, personId: session.personId };

  // The skip: stamp-and-move-on. Nothing is written to the prior run — its
  // promises stay open and resurface next time (spec scenario 5).
  if (body.skipped === true) {
    const prior = await deps.findPrior({ ...fence, excludeId: session.id });
    stamp(session, { fromSessionId: prior?.sessionId ?? "", skipped: true, outcomes: [], at: Date.now() }, deps);
    return { ok: true, skipped: true, applied: 0 };
  }

  if (!Array.isArray(body.outcomes) || body.outcomes.length === 0) throw badRequest("outcomes must be a non-empty list");
  const taps: OutcomeTap[] = body.outcomes.map((raw: unknown) => {
    const t = asRecord(raw);
    const id = asString(t.id);
    const outcome = asString(t.outcome);
    if (!id || !OUTCOMES.has(outcome)) throw badRequest("each outcome needs a promise id and yes/partly/no/changed");
    return { id, outcome: outcome as PromiseOutcome };
  });

  const prior = await deps.findPrior({ ...fence, excludeId: session.id });
  if (!prior) throw badRequest("no open promises to close for this person");

  const known = new Map(prior.promises.map((p) => [p.id, p]));
  const matched = taps.filter((t) => known.has(t.id));
  if (matched.length === 0) throw badRequest("outcomes don't match the open promises");

  // Write the DESTINATION: the prior run. Live copy first (still resident within
  // the TTL — mutating only the store would be clobbered by its next persist).
  const live = deps.liveSession(prior.sessionId);
  let applied = 0;
  if (live) {
    applied = applyPromiseOutcomes(live as unknown as Record<string, unknown>, matched);
    if (applied > 0) deps.persist(live);
  } else {
    const wrote = await deps.writeToStore(prior.sessionId, fence, matched);
    applied = wrote ? matched.length : 0;
  }
  if (applied === 0) {
    throw Object.assign(new Error("couldn't record the outcomes on the previous 1:1"), { status: 500 });
  }

  stamp(
    session,
    {
      fromSessionId: prior.sessionId,
      skipped: false,
      outcomes: matched.map((t) => {
        const p = known.get(t.id)!;
        return { id: p.id, owner: p.owner, action: p.action, outcome: t.outcome };
      }),
      at: Date.now(),
    },
    deps,
  );
  return { ok: true, skipped: false, applied };
}

function stamp(session: Session, checkin: PriorCheckin, deps: CheckinDeps): void {
  session.priorCheckin = checkin;
  deps.persist(session);
}
