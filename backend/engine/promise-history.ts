// Promise history for repeat sessions (Promises loop phase 2 — card zero).
//
// The most recent 1:1 with the SAME person that still carries OPEN promises,
// so the next 1:1 can open by closing them off — and the write path that puts
// the manager's taps back onto THAT run. Fenced exactly like focus-history:
// same manager (userId) + same roster person (personId) only, via the shared
// historyRunMatches fence. Declared facts only (no-inference ruling): unknown
// promise ids and invalid outcome values are ignored, never invented, and a
// skip writes nothing.
//
// Same file/pg split as focus-history: file walk here, pgPriorPromiseRun /
// pgWritePromiseOutcomes in db/runs-store.ts. A broken read must never block
// a 1:1 — the dispatchers swallow store errors.

import fs from "node:fs";
import path from "node:path";
import { walkRuns, findRunDir } from "./run-history.ts";
import { historyRunMatches } from "./focus-history.ts";
import { asRecord, asString } from "../shared/guards.ts";
import type { SessionPromise, PriorCheckin } from "../shared/session.types.ts";

export interface PriorPromiseRun {
  sessionId: string;
  when: number; // epoch ms of that run's last activity
  promises: SessionPromise[]; // OPEN promises only (outcome still null)
}

export interface PriorPromiseQuery {
  orgId?: string | null;
  userId?: string | null;
  personId?: string | null;
  excludeId?: string | null; // the session being started — never its own prior
}

export type PromiseOutcome = "yes" | "partly" | "no" | "changed";
const OUTCOMES: ReadonlySet<string> = new Set(["yes", "partly", "no", "changed"]);

export interface OutcomeTap {
  id: string;
  outcome: PromiseOutcome;
}

// Untrusted stored shape → validated promises. Mirrors the phase-1 write
// validation (owner enum + non-empty action); outcome narrowed to the enum.
export function promisesFromState(state: unknown): SessionPromise[] {
  const s = asRecord(state);
  const raw: unknown[] = Array.isArray(s.promises) ? s.promises : [];
  const out: SessionPromise[] = [];
  for (const entry of raw) {
    const p = asRecord(entry);
    const id = asString(p.id);
    const action = asString(p.action).trim();
    const owner = p.owner;
    if (!id || !action || (owner !== "manager" && owner !== "report")) continue;
    out.push({
      id,
      owner,
      action,
      when: asString(p.when).trim(),
      outcome: typeof p.outcome === "string" && OUTCOMES.has(p.outcome) ? (p.outcome as PromiseOutcome) : null,
      at: typeof p.at === "number" ? p.at : 0,
    });
  }
  return out;
}

// One run's state as a card-zero payload: only OPEN promises resurface (a
// closed-off promise never gets re-asked). Null when nothing is open.
export function priorPromiseRunFromState(state: unknown): PriorPromiseRun | null {
  const s = asRecord(state);
  const open = promisesFromState(state).filter((p) => p.outcome === null);
  if (open.length === 0) return null;
  const id = asString(s.id);
  if (!id) return null;
  return {
    sessionId: id,
    when: typeof s.lastSeenAt === "number" ? s.lastSeenAt : 0,
    promises: open,
  };
}

// The outcomeCheck roll-up (spec §6's consumer): over the DECLARED outcomes
// only — unanimous verdict wins, a mix is "partly", nothing declared is null.
export function rollupOutcome(promises: Array<{ outcome: SessionPromise["outcome"] }>): SessionPromise["outcome"] {
  const declared = promises.map((p) => p.outcome).filter((o): o is PromiseOutcome => o !== null && OUTCOMES.has(o));
  if (declared.length === 0) return null;
  const first = declared[0]!;
  return declared.every((o) => o === first) ? first : "partly";
}

// Promises loop phase 3 — the check-in as a prompt block for the reviewer (and the
// turn-1 planner). Reads the CURRENT session's priorCheckin (what the manager tapped
// about last time's promises at card zero). Manager's own promises first. Declared
// facts only: a skip or an empty check-in yields the sentinel, so the prompt slot is
// inert and the model adds nothing. Unfinished (no/partly/changed) are called out so
// the reviewer rolls them into next_actions and the planner can raise them early.
const OUTCOME_WORD: Record<PromiseOutcome, string> = {
  yes: "done",
  partly: "partly done",
  no: "NOT done",
  changed: "changed",
};
export function formatPromiseCheckin(checkin: PriorCheckin | null | undefined): string {
  const NONE = "(no promise check-in — none was recorded for this 1:1)";
  if (!checkin || checkin.skipped || !Array.isArray(checkin.outcomes) || checkin.outcomes.length === 0) return NONE;
  const rows = checkin.outcomes
    .filter((o) => o && typeof o.action === "string" && o.action.trim() && OUTCOMES.has(o.outcome))
    .slice()
    .sort((a, b) => Number(a.owner !== "manager") - Number(b.owner !== "manager"));
  if (rows.length === 0) return NONE;
  const lines = rows.map((o) => {
    const who = o.owner === "manager" ? "manager's own" : "the team member's";
    return `- "${o.action.trim()}" (${who}) — ${OUTCOME_WORD[o.outcome as PromiseOutcome]}`;
  });
  const unfinished = rows.filter((o) => o.outcome !== "yes").length;
  const tail =
    unfinished > 0
      ? `${unfinished} of these is unfinished (not "done"). Acknowledge the follow-through picture, and roll every unfinished item into next_actions so it is not dropped.`
      : `All were done — acknowledge the follow-through briefly; add nothing to next_actions on their account.`;
  return `At the start of this 1:1 the manager checked off last time's agreed actions:\n${lines.join("\n")}\n${tail}`;
}

// Write taps onto a state record (the PRIOR run's), in place: matches by
// promise id, ignores unknown ids and invalid values, then rolls up
// outcomeCheck. Returns how many taps actually landed.
export function applyPromiseOutcomes(state: Record<string, unknown>, taps: Array<{ id: string; outcome: string }>): number {
  const raw: unknown[] = Array.isArray(state.promises) ? state.promises : [];
  let applied = 0;
  for (const tap of taps) {
    if (!tap || typeof tap.id !== "string" || !OUTCOMES.has(tap.outcome)) continue;
    const hit = raw.map(asRecord).find((p) => p.id === tap.id);
    if (!hit) continue;
    hit.outcome = tap.outcome;
    applied++;
  }
  if (applied > 0) {
    state.outcomeCheck = rollupOutcome(raw.map((p) => ({ outcome: asRecord(p).outcome as SessionPromise["outcome"] })));
  }
  return applied;
}

// File-store read: newest run for this manager+person still carrying open
// promises. Same fence + sort as fileFocusHistory.
export function filePriorPromiseRun({ orgId, userId, personId, excludeId }: PriorPromiseQuery): PriorPromiseRun | null {
  const runs = walkRuns(orgId)
    .filter((r) => r.id !== excludeId && historyRunMatches(r.state, { userId, personId }))
    .sort((a, b) => (typeof b.state.lastSeenAt === "number" ? b.state.lastSeenAt : 0) - (typeof a.state.lastSeenAt === "number" ? a.state.lastSeenAt : 0));
  for (const r of runs) {
    const prior = priorPromiseRunFromState(r.state);
    if (prior) return prior;
  }
  return null;
}

const STATE_FILE = "session-state.json";

// File-store write-back: fence, apply, rewrite the prior run's state file.
// False when the run is missing, foreign, or nothing landed.
export function fileWritePromiseOutcomes(
  runId: string,
  { userId, personId }: { userId?: string | null; personId?: string | null },
  taps: OutcomeTap[],
): boolean {
  const dir = findRunDir(runId);
  if (!dir) return false;
  const file = path.join(dir, STATE_FILE);
  let state: unknown;
  try {
    state = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return false;
  }
  if (!historyRunMatches(state, { userId, personId })) return false;
  const rec = asRecord(state) as Record<string, unknown>;
  const applied = applyPromiseOutcomes(rec, taps);
  if (applied === 0) return false;
  try {
    fs.writeFileSync(file, JSON.stringify(rec, null, 2));
    return true;
  } catch (e) {
    console.warn("[promise-history] write-back failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

// Store dispatcher (read) — same seam as focusHistoryFor. Errors degrade to
// null: a broken history read must never block starting a 1:1.
export async function priorPromiseRunFor(query: PriorPromiseQuery): Promise<PriorPromiseRun | null> {
  if (!query.personId || !query.userId) return null;
  try {
    const { hasDatabaseUrl } = await import("../db/client.ts");
    if (hasDatabaseUrl()) {
      const { pgPriorPromiseRun } = await import("../db/runs-store.ts");
      return await pgPriorPromiseRun(query);
    }
    return filePriorPromiseRun(query);
  } catch (e) {
    console.warn("[promise-history] read failed (continuing without check-in):", e instanceof Error ? e.message : e);
    return null;
  }
}

// Store dispatcher (write). NOT error-swallowed the same way — the caller needs
// to know whether the taps really landed (verify-the-destination rule); a store
// error surfaces as false and the endpoint reports it honestly.
export async function writePromiseOutcomesToStore(
  runId: string,
  fence: { orgId?: string | null; userId?: string | null; personId?: string | null },
  taps: OutcomeTap[],
): Promise<boolean> {
  const { hasDatabaseUrl } = await import("../db/client.ts");
  if (hasDatabaseUrl()) {
    const { pgWritePromiseOutcomes } = await import("../db/runs-store.ts");
    return pgWritePromiseOutcomes(runId, fence, taps);
  }
  return fileWritePromiseOutcomes(runId, fence, taps);
}
