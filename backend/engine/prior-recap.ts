// Prior recap for repeat sessions — what the prep brief is told about last time.
//
// The most recent FINISHED 1:1 with the SAME person, projected down to the four
// things a manager needs before walking in: one line on what it was, what was
// agreed and how each item landed, and the four reads that run ended on. Nothing
// else travels: no transcript, no notes, no bullets.
//
// Why this exists at all: the prep prompt was already fed the previous 1:1, but
// only the core issue and opener the engine PROPOSED, under an instruction to
// avoid repeating them (prep-history.ts). It had never been shown what actually
// HAPPENED. This is that half, and the two must never read as the same kind of
// thing, which is what renderPriorOutcomeBlock spends most of its length on.
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
import { isRelationalArc } from "./relational-arcs.ts";
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

// ---- The {{PRIOR_OUTCOME_BLOCK}} fill -------------------------------------------------

const OUTCOME_WORDS: Record<string, string> = {
  yes: "done",
  partly: "partly done",
  no: "not done",
  changed: "overtaken, the plan changed",
};

// No outcome recorded is its own state and must not be read as "not done": the
// pair may simply never have reached the check-off.
const NO_OUTCOME = "never checked off";

const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/**
 * One finished run as the prep prompt reads it.
 *
 * Three tiers of claim live in this block and each is labelled, because the
 * model beside it is being told to AVOID last time's hypothesis and USE last
 * time's facts, and it can only obey both if it can tell them apart:
 *
 *   fact       agreed items confirmed by the manager at the wrap-up, with outcomes
 *   proposed   the briefing's own next_actions, which nobody ever confirmed
 *   inference  the headline and the four axis reads
 *
 * Arc fence, split on purpose. Facts cross meeting types (promise-history has no
 * arc fence, and the runner already shows last time's actions across arcs). The
 * engine's own framing does not, exactly like prep-history: a performance
 * review's read must not seed a check-in. When the arcs differ, the block says
 * what it is withholding rather than quietly shrinking.
 *
 * Deliberately free of em dashes: the model that reads this writes the brief,
 * and it copies the punctuation it is shown.
 */
export function renderPriorOutcomeBlock(
  recap: PriorRecap | null | undefined,
  currentMeetingType?: string,
): string {
  if (!recap) return "(no finished 1:1 with this person yet)";

  const when = recap.when ? new Date(recap.when).toISOString().slice(0, 10) : "unknown date";
  const type = recap.meetingType || "unknown type";
  const lines: string[] = [`Last 1:1 with this person: ${when}, ${type}.`];

  // Arc fence: only the engine's own framing is withheld, never the facts.
  const arcBlocks = !isRelationalArc(currentMeetingType) || isRelationalArc(recap.meetingType);

  if (!arcBlocks) {
    lines.push(
      "",
      `That meeting was a ${type}, a different kind of conversation, so its written read and its scores are not carried into this brief. What was agreed still stands and is below.`,
    );
  } else if (recap.summaryMissing) {
    lines.push(
      "",
      "That meeting finished without a written read, so there is no summary of it to quote. What was agreed, and where the reads finished, are still real.",
    );
  } else if (recap.headline) {
    lines.push(
      "",
      "What that meeting was read as (the engine's inference at the time, a written read, not a transcript and not fact):",
      `"${recap.headline}"`,
    );
  }

  if (recap.agreed.length === 0) {
    lines.push("", "Nothing was agreed or proposed at the end of that meeting.");
  } else if (recap.agreedSource === "promises") {
    lines.push(
      "",
      "What you both agreed at the end, and how each one landed (confirmed by the manager at the wrap-up, so these are fact):",
      ...recap.agreed.map((a) => {
        const who = a.owner === "report" ? "they" : "you";
        return `- ${who}: ${a.action}: ${a.outcome ? OUTCOME_WORDS[a.outcome] || NO_OUTCOME : NO_OUTCOME}`;
      }),
    );
  } else {
    lines.push(
      "",
      "What the engine suggested at the end of that meeting (proposed by the engine, never confirmed by anyone, and nobody owns them, so no follow-through exists):",
      ...recap.agreed.map((a) => `- ${a.action}`),
    );
  }

  if (arcBlocks && recap.axes.length > 0) {
    lines.push(
      "",
      "Where the four reads finished (the engine's inference from that conversation, not fact):",
      recap.axes.map((a) => `${a.id}: ${a.read && a.score !== null ? signed(a.score) : "not read"}`).join(", "),
    );
  }

  return lines.join("\n");
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
