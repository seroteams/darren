// The walk-in glance (last-one-to-one Phase 2) — glue between the thin controller
// and the engine's prior-recap store halves. Read-only: nothing is written, and
// nothing here reaches a prompt.
//
// Eligibility mirrors the promise check-in's, minus its two write-side rules. It
// is a BEFORE-you-walk-in surface, so it retires once the meeting has a turn on
// it; and it needs a person and a manager to fence on, or it must not answer at
// all. Unlike card zero it does NOT retire on priorCheckin: tapping last time's
// actions off does not mean you stop wanting to see what last time was.

import {
  priorRecapFor,
  type PriorRecap,
  type PriorRecapQuery,
} from "../../../engine/prior-recap.ts";
import type { Session } from "../../../shared/session.types.ts";

/** Injected seam so the glue is testable offline; production callers use the default. */
export interface RecapDeps {
  findPrior: (q: PriorRecapQuery) => Promise<PriorRecap | null>;
}

const defaultDeps: RecapDeps = { findPrior: priorRecapFor };

// Shown before question 1 of a real, person-linked run. A scripted/persona run
// has no manager history to speak of, and a run with no personId cannot be
// fenced to a person without guessing at a name (the fence the engine keeps
// everywhere else).
export function recapEligible(session: Session): boolean {
  return (
    session.transcript.length === 0 &&
    session.mode !== "scripted" &&
    Boolean(session.personId) &&
    Boolean(session.userId)
  );
}

export async function priorRecapForSession(
  session: Session,
  deps: RecapDeps = defaultDeps,
): Promise<PriorRecap | null> {
  if (!recapEligible(session)) return null;
  return deps.findPrior({
    orgId: session.orgId,
    userId: session.userId,
    personId: session.personId,
    excludeId: session.id,
  });
}
