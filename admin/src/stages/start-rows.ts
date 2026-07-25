// Home's row vocabulary (home-screen-truth Phase 1). Pure functions so the copy
// contract is unit-tested, mirroring intake-firstrun.ts — start-core.js mounts
// through the DOM, so its own guard can only read source text.
//
// The rule these exist to hold: the raw `headline` string is NEVER a fallback for a
// row name. It is built as "Name · Role · Seniority · MeetingType" and the seniority
// field has been seen carrying an email address, so a screen that falls back to it
// prints the manager's own email at them. "Untitled 1:1" is the honest answer.
import { whenLabel, whenLabelsFor } from "../ui/time.ts";

export type RunStatus = "done" | "open";

export interface RecentRun {
  id: string;
  lastSeenAt?: number;
  stage?: string;
  isDemo?: boolean;
  ctx?: { name?: string; meetingType?: string } | null;
}

export interface RowModel {
  name: string;
  sub: string;
  status: RunStatus;
  isExample: boolean;
}

// One bit, deliberately. inferStage() reports EVAL for "answered everything, no
// briefing yet" and FOCUS_POINTS for "typed a name and stopped", so any finer
// progress claim ("step 3 of 7") would be dishonest at both ends.
// `when` lets the caller hand in one date vocabulary for the whole list (audit F11);
// without it each row decides for itself, which is how Home ended up with "5d ago"
// directly above "Fri 17 Jul 2026".
export function rowModel(run: RecentRun, when: (ms: number) => string = whenLabel): RowModel {
  const ctx = run?.ctx || {};
  return {
    name: ctx.name || "Untitled 1:1",
    sub: [ctx.meetingType, when(Number(run?.lastSeenAt) || 0)].filter(Boolean).join(" · "),
    status: run?.stage === "BRIEFING" ? "done" : "open",
    // Every new signup is seeded with an example 1:1. Unlabelled, it reads as a
    // product that invents history. Absent means real: never guess the other way.
    isExample: run?.isDemo === true,
  };
}

// One rule for "has this manager actually run a 1:1?". Home's invitation card and the
// intake wizard's beginner help each held their own copy, and they disagreed: the wizard
// counted the seeded example, so no new signup ever saw its help. Any future gate on
// first-run state (the quiet rail, demo-member's Remove example) calls this too.
export function hasRealRuns(runs: unknown): boolean {
  return Array.isArray(runs) && runs.some((r) => !rowModel(r as RecentRun).isExample);
}

// Runs arrive newest-first. Lift the newest unfinished prep to the top and leave
// everything else in that order: an abandoned prep is the one thing on this screen
// a manager came back for, and it is otherwise indistinguishable from a finished one.
export function orderForHome<T extends RecentRun>(runs: T[], max = 3): T[] {
  const list = Array.isArray(runs) ? runs.slice() : [];
  let newestOpen = -1;
  for (let i = 0; i < list.length; i++) {
    if (rowModel(list[i]!).status !== "open") continue;
    if (newestOpen === -1 || (Number(list[i]!.lastSeenAt) || 0) > (Number(list[newestOpen]!.lastSeenAt) || 0)) {
      newestOpen = i;
    }
  }
  if (newestOpen > 0) list.unshift(list.splice(newestOpen, 1)[0]!);
  return list.slice(0, max);
}
