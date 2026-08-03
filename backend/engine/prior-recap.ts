// Prior recap for repeat sessions (last-one-to-one Phase 2).
//
// The most recent FINISHED 1:1 with the SAME person, projected down to what the
// walk-in screen's right half needs for a 20-second glance: one line on what it
// was, what was agreed and how each item landed, and the four reads that run
// ended on. Nothing else travels: no transcript, no notes, no bullets.
//
// Fenced exactly like focus-history and promise-history: same manager (userId)
// plus same roster person (personId), via the shared historyRunMatches fence.
// Same file/pg split too: the file walk lives here, pgPriorRecap in
// db/runs-store.ts. A broken read must never block a 1:1, so the dispatcher
// swallows store errors and returns null.
//
// Honesty: every field is quoted from the stored run. The headline is the
// briefing's own (measured over 59 saved runs: 13 to 23 words, median 19) and is
// never shortened here. A run that armed no promise loop falls back to the
// briefing's suggested next_actions, LABELLED as such, because those were never
// manager-confirmed and carry no follow-through (no-inference ruling). An axis
// the meeting never read says so rather than reporting a 0 it did not earn.

import { walkRuns } from "./run-history.ts";
import { historyRunMatches } from "./focus-history.ts";
import { promisesFromState } from "./promise-history.ts";
import { asRecord, asString } from "../shared/guards.ts";

/**
 * One agreed item as the glance shows it. `outcome` is null when it was never
 * checked off. `owner` is null for a SUGGESTED item: the briefing proposes an
 * action without saying whose it is, and picking one would be inventing a fact.
 */
export interface PriorRecapItem {
  owner: "manager" | "report" | null;
  action: string;
  outcome: "yes" | "partly" | "no" | "changed" | null;
}

/** One axis as that meeting finished on it. `score` is null when it was never read. */
export interface PriorRecapAxis {
  id: string;
  score: number | null;
  read: boolean;
}

export interface PriorRecap {
  sessionId: string;
  when: number; // epoch ms of that run's last activity
  meetingType: string;
  /** The briefing's own headline, verbatim. "" when the briefing never generated. */
  headline: string;
  /**
   * That 1:1 finished on a FALLBACK briefing, so there is no written read to
   * quote. The agreements and the live scores from it are still real, so the run
   * is still last time; only the sentence is missing, and the panel says so
   * rather than quoting "Briefing generation failed" as what the meeting was.
   */
  summaryMissing: boolean;
  /** "promises" = manager-confirmed at the wrap-up · "suggested" = the briefing's own next_actions, never confirmed. */
  agreedSource: "promises" | "suggested";
  agreed: PriorRecapItem[];
  axes: PriorRecapAxis[];
}

export interface PriorRecapQuery {
  orgId?: string | null;
  userId?: string | null;
  personId?: string | null;
  excludeId?: string | null; // the session being started — never its own prior
}

const MAX_ITEMS = 6; // a glance, not a ledger; the confirm card already caps at 10

function briefingOf(state: unknown): Record<string, unknown> | null {
  const b = asRecord(asRecord(state).briefing);
  return Object.keys(b).length ? b : null;
}

// The briefing's suggested actions, for runs that predate the promise loop or
// skipped the confirm card. Nobody confirmed them and nobody owns them, so both
// owner and outcome stay null and agreedSource names them for what they are.
function itemsFromNextActions(briefing: Record<string, unknown>): PriorRecapItem[] {
  const raw: unknown[] = Array.isArray(briefing.next_actions) ? briefing.next_actions : [];
  const out: PriorRecapItem[] = [];
  for (const entry of raw) {
    const action = asString(asRecord(entry).action).trim();
    if (action) out.push({ owner: null, action, outcome: null });
  }
  return out;
}

// briefing.axes → the glance's four. read_status is authoritative (briefing.types.ts):
// an axis that was never read carries no score here, whatever number is stored beside it.
export function axesFromBriefing(briefing: Record<string, unknown>): PriorRecapAxis[] {
  const raw: unknown[] = Array.isArray(briefing.axes) ? briefing.axes : [];
  const out: PriorRecapAxis[] = [];
  for (const entry of raw) {
    const a = asRecord(entry);
    const id = asString(a.id);
    if (!id) continue;
    const read = a.read_status === "read" && typeof a.score === "number";
    out.push({ id, score: read ? (a.score as number) : null, read });
  }
  return out;
}

/**
 * One run's state as a glance payload. Null unless the run actually FINISHED
 * (a briefing is what `finished` is derived from, session-persistence.ts) — an
 * abandoned prep has nothing to say about last time.
 *
 * A run that finished on a FALLBACK briefing still counts as last time: its
 * agreements and its live scores are real, and skipping it would silently show
 * the meeting BEFORE it as "last time", which is worse than a missing sentence.
 * What it must not do is quote the fallback's own "Briefing generation failed…"
 * line as the summary of the conversation, so that headline is dropped and
 * summaryMissing carries the fact instead.
 */
export function priorRecapFromState(state: unknown): PriorRecap | null {
  const s = asRecord(state);
  const id = asString(s.id);
  const briefing = briefingOf(state);
  if (!id || !briefing) return null;
  const summaryMissing = briefing.generation_failed === true;
  const headline = summaryMissing ? "" : asString(briefing.headline).trim();
  if (!headline && !summaryMissing) return null;

  const confirmed = promisesFromState(state);
  const agreedSource: PriorRecap["agreedSource"] = confirmed.length ? "promises" : "suggested";
  const agreed = (
    confirmed.length
      ? confirmed.map((p) => ({ owner: p.owner, action: p.action, outcome: p.outcome }))
      : itemsFromNextActions(briefing)
  ).slice(0, MAX_ITEMS);

  return {
    sessionId: id,
    when: typeof s.lastSeenAt === "number" ? s.lastSeenAt : 0,
    meetingType: asString(asRecord(s.ctx).meetingType).trim(),
    headline,
    summaryMissing,
    agreedSource,
    agreed,
    axes: axesFromBriefing(briefing),
  };
}

/** File-store read: newest FINISHED run for this manager+person. Same fence and sort as filePriorPromiseRun. */
export function filePriorRecap({ orgId, userId, personId, excludeId }: PriorRecapQuery): PriorRecap | null {
  const runs = walkRuns(orgId)
    .filter((r) => r.id !== excludeId && historyRunMatches(r.state, { userId, personId }))
    .sort(
      (a, b) =>
        (typeof b.state.lastSeenAt === "number" ? b.state.lastSeenAt : 0) -
        (typeof a.state.lastSeenAt === "number" ? a.state.lastSeenAt : 0),
    );
  for (const r of runs) {
    const recap = priorRecapFromState(r.state);
    if (recap) return recap;
  }
  return null;
}

/** Store dispatcher — same seam as priorPromiseRunFor. Errors degrade to null. */
export async function priorRecapFor(query: PriorRecapQuery): Promise<PriorRecap | null> {
  if (!query.personId || !query.userId) return null;
  try {
    const { hasDatabaseUrl } = await import("../db/client.ts");
    if (hasDatabaseUrl()) {
      const { pgPriorRecap } = await import("../db/runs-store.ts");
      return await pgPriorRecap(query);
    }
    return filePriorRecap(query);
  } catch (e) {
    console.warn("[prior-recap] read failed (continuing without the glance):", e instanceof Error ? e.message : e);
    return null;
  }
}
