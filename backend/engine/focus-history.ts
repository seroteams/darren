// Focus history for repeat sessions (focus-freshness Phase 1).
//
// What earlier 1:1s with the SAME person focused on, so the focus-points prompt
// can prefer fresh ground. Fenced hard: same manager (userId) + same roster
// person (personId) only — another manager's prep angles never leak in, and a
// run without a personId contributes nothing (no name-guessing). Only ids,
// labels, and dates ride along — never past note text (no-inference ruling:
// structured events are allowed evidence).
//
// The pure fence/mapper halves are shared by both stores (file walk here,
// pgFocusHistory in db/runs-store.ts), same split as run-history's wall
// functions. History must never break a prep: the dispatcher swallows store
// errors and returns [].

import { walkRuns, runOwnedByUser } from "./run-history.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { asRecord, asString } from "../shared/guards.ts";

export interface FocusHistoryPoint {
  id: string;
  type: string | null; // catalogue label
  category: string | null; // wellbeing | topic | competency
  label: string; // the tailored label the manager saw
}

export interface FocusHistorySession {
  when: number; // epoch ms
  meetingType: string;
  points: FocusHistoryPoint[];
}

export interface FocusHistoryQuery {
  orgId?: string | null;
  userId?: string | null;
  personId?: string | null;
  limit?: number;
  // The session being generated for — excluded so a regenerate never sees its
  // own first attempt as "an earlier 1:1".
  excludeId?: string | null;
}

const DEFAULT_LIMIT = 3;

// The fence: same roster person, same manager. personId is required on BOTH
// sides; userId delegates to the engine's own member wall. Unfinished preps
// count on purpose (Carl's call 2026-07-11): the freshness goal is "don't
// re-suggest the same agenda", and the agenda was suggested whether or not
// the run reached a briefing. Runs with no focus output are dropped by the
// mapper, not here.
export function historyRunMatches(
  state: unknown,
  { userId, personId }: { userId?: string | null; personId?: string | null }
): boolean {
  if (!personId) return false;
  const s = asRecord(state);
  if (asString(s.personId) !== personId) return false;
  return runOwnedByUser(state, userId);
}

// One run's saved focus output (state.focusPointsResult — the parsed, shipped
// result both stores persist) as a history session. Null when the run carries
// no usable focus points.
export function historySessionFromState(state: unknown): FocusHistorySession | null {
  const s = asRecord(state);
  const result = asRecord(s.focusPointsResult);
  const raw: unknown[] = Array.isArray(result.focus_points) ? result.focus_points : [];
  const points = raw
    .map((p): FocusHistoryPoint => {
      const rec = asRecord(p);
      return {
        id: asString(rec.id),
        type: asString(rec.type) || null,
        category: asString(rec.category) || null,
        label: asString(rec.label),
      };
    })
    .filter((p) => p.id);
  if (points.length === 0) return null;
  return {
    when: typeof s.lastSeenAt === "number" ? s.lastSeenAt : 0,
    meetingType: asString(asRecord(s.ctx).meetingType),
    points,
  };
}

// Relational arcs never see competency history — a past performance review's
// focus ids must not put evaluative anchors in front of a check-in prompt.
// Same rule as filterForArc (role-profile.ts); FOCUS_ARC_LEAK stays as backstop.
export function filterHistoryForArc(sessions: FocusHistorySession[], meetingType: string): FocusHistorySession[] {
  if (!isRelationalArc(meetingType)) return sessions;
  return sessions
    .map((s) => ({ ...s, points: s.points.filter((p) => p.category !== "competency") }))
    .filter((s) => s.points.length > 0);
}

function dateOf(when: number): string {
  return when > 0 ? new Date(when).toISOString().slice(0, 10) : "(date unknown)";
}

// The block the prompt template receives for {{FOCUS_HISTORY_BLOCK}}. Always a
// non-empty string so the placeholder never dangles.
export function renderFocusHistoryBlock(sessions: FocusHistorySession[], meetingType: string): string {
  const visible = filterHistoryForArc(sessions, meetingType);
  if (visible.length === 0) {
    return "(first session with this person — no earlier 1:1 focus history)";
  }
  return visible
    .map((s) => {
      const points = s.points.map((p) => `${p.type || p.id} ("${p.label}")`).join(", ");
      return `- ${dateOf(s.when)} · ${s.meetingType || "1:1"}: ${points}`;
    })
    .join("\n");
}

// File-store read: walk this company's runs, apply the fence, newest first.
export function fileFocusHistory({ orgId, userId, personId, limit = DEFAULT_LIMIT, excludeId }: FocusHistoryQuery): FocusHistorySession[] {
  return walkRuns(orgId)
    .filter((r) => r.id !== excludeId && historyRunMatches(r.state, { userId, personId }))
    .sort((a, b) => (typeof b.state.lastSeenAt === "number" ? b.state.lastSeenAt : 0) - (typeof a.state.lastSeenAt === "number" ? a.state.lastSeenAt : 0))
    .map((r) => historySessionFromState(r.state))
    .filter((s): s is FocusHistorySession => s !== null)
    .slice(0, limit); // slice AFTER the mapper so focus-less preps never eat a slot
}

// Store dispatcher (same seam as sessionsRepo). Lazy-imports the pg twin so
// engine consumers without a database never touch drizzle. Errors degrade to
// [] — a broken history read must never block a prep.
export async function focusHistoryFor(query: FocusHistoryQuery): Promise<FocusHistorySession[]> {
  if (!query.personId || !query.userId) return [];
  try {
    const { hasDatabaseUrl } = await import("../db/client.ts");
    if (hasDatabaseUrl()) {
      const { pgFocusHistory } = await import("../db/runs-store.ts");
      return await pgFocusHistory(query);
    }
    return fileFocusHistory(query);
  } catch (e) {
    console.warn("[focus-history] read failed (continuing without history):", e instanceof Error ? e.message : e);
    return [];
  }
}
