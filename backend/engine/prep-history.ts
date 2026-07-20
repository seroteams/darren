// Prep freshness (better-reads Phase 3) — the most recent prep brief for the
// SAME manager + roster person, surfaced into the next prep so the model can
// deliberately open new ground instead of re-writing last time's briefing.
//
// Fenced exactly like focus-history / promise-history: same manager (userId) +
// same person (personId) only, via the shared historyRunMatches fence. Privacy:
// only brief fields + dates ride along — NEVER the manager's notes text.
// Arc fence: a relational-arc meeting (bi-weekly / feels-off) only sees a
// prior relational-arc brief — a performance review's framing must not seed a
// check-in (FOCUS_ARC_LEAK's sibling, one layer earlier).
//
// Same file/pg split as its siblings: file walk here, pgPrepHistory in
// db/runs-store.ts. A broken read must never block a prep — the dispatcher
// swallows store errors and degrades to null.

import { walkRuns } from "./run-history.ts";
import { historyRunMatches } from "./focus-history.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { asRecord, asString } from "../shared/guards.ts";

export interface PrepHistoryEntry {
  when: number; // epoch ms of that run's last activity
  meetingType: string;
  coreIssue: string;
  openingQuestion: string;
}

export interface PrepHistoryQuery {
  orgId?: string | null;
  userId?: string | null;
  personId?: string | null;
  excludeId?: string | null; // the session being prepped — never its own prior
}

// Untrusted stored state → the four surfaced fields, or null when there is no
// brief worth surfacing. Deliberately reads NOTHING outside preparationResult
// .brief + lastSeenAt + ctx.meetingType.
export function prepHistoryFromState(state: unknown): PrepHistoryEntry | null {
  const s = asRecord(state);
  const brief = asRecord(asRecord(s.preparationResult).brief);
  const coreIssue = asString(brief.coreIssue).trim();
  const openingQuestion = asString(brief.openingQuestion).trim();
  if (!coreIssue && !openingQuestion) return null;
  return {
    when: typeof s.lastSeenAt === "number" ? s.lastSeenAt : 0,
    meetingType: asString(asRecord(s.ctx).meetingType),
    coreIssue,
    openingQuestion,
  };
}

// Arc fence: when the CURRENT meeting is relational, only a prior relational
// brief may surface. Non-relational meetings see everything.
export function filterPrepHistoryForArc(entries: PrepHistoryEntry[], currentMeetingType: string): PrepHistoryEntry[] {
  if (!isRelationalArc(currentMeetingType)) return entries;
  return entries.filter((e) => isRelationalArc(e.meetingType));
}

// The {{PREP_HISTORY_BLOCK}} fill. ≤4 rendered lines; the instruction wording
// lives in the prompt, this block only carries the facts.
export function renderPrepHistoryBlock(entry: PrepHistoryEntry | null | undefined): string {
  if (!entry) return "(first prep for this person — no prior brief)";
  const when = entry.when ? new Date(entry.when).toISOString().slice(0, 10) : "unknown date";
  return [
    `Last brief (${when}, ${entry.meetingType || "unknown type"}):`,
    `- Core issue then: ${entry.coreIssue || "(none)"}`,
    `- Opener then: ${entry.openingQuestion || "(none)"}`,
  ].join("\n");
}

// File-store read: newest matching run that carries a brief, arc-fenced.
// Same fence + sort as filePriorPromiseRun.
export function filePrepHistory({ orgId, userId, personId, excludeId }: PrepHistoryQuery, currentMeetingType?: string): PrepHistoryEntry | null {
  if (!userId || !personId) return null;
  const runs = walkRuns(orgId)
    .filter((r) => r.id !== excludeId && historyRunMatches(r.state, { userId, personId }))
    .sort((a, b) => (typeof b.state.lastSeenAt === "number" ? b.state.lastSeenAt : 0) - (typeof a.state.lastSeenAt === "number" ? a.state.lastSeenAt : 0));
  for (const r of runs) {
    const entry = prepHistoryFromState(r.state);
    if (!entry) continue;
    const kept = currentMeetingType ? filterPrepHistoryForArc([entry], currentMeetingType) : [entry];
    if (kept.length > 0) return kept[0]!;
  }
  return null;
}

// Store dispatcher — same seam as priorPromiseRunFor. Errors degrade to null:
// a broken history read must never block a prep.
export async function prepHistoryFor(query: PrepHistoryQuery, currentMeetingType?: string): Promise<PrepHistoryEntry | null> {
  if (!query.personId || !query.userId) return null;
  try {
    const { hasDatabaseUrl } = await import("../db/client.ts");
    if (hasDatabaseUrl()) {
      const { pgPrepHistory } = await import("../db/runs-store.ts");
      return await pgPrepHistory(query, currentMeetingType);
    }
    return filePrepHistory(query, currentMeetingType);
  } catch (e) {
    console.warn("[prep-history] read failed (continuing without freshness):", e instanceof Error ? e.message : e);
    return null;
  }
}
