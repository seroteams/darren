// Pure row projection for the Regression board. No DOM, no fetch — everything
// here is a value in, a value out, so the table's wording is unit-testable.
//
// Phase 1 only needs the "never rerun" states; the trust / committee / review
// cells arrive in Phases 2-4 and slot into the same shape.

/** The trust-check grade a rerun recorded, as the board reads it. */
export interface RerunGrade {
  actual?: { verdict?: string; hard_fails?: string[] };
  expected?: { verdict?: string; hard_fails?: string[] };
  newHardFails?: string[];
  regressed?: boolean;
  answersRanOut?: boolean;
}

/** What the AI reviewer recorded on a rerun. */
export interface RerunJudge {
  score?: number;
  head_to_head?: { overall?: "improved" | "same" | "worse"; reason?: string } | null;
  flags?: string[];
  /** Set instead of a verdict when the reviewer could not run. */
  unavailable?: boolean;
}

export interface RerunSummary {
  runId: string;
  batchId: string;
  finishedAt: number | null;
  grade?: RerunGrade | null;
  judge?: RerunJudge | null;
  review?: { reviewStatus?: string; reviewOverall?: string } | null;
}

export interface BoardCase {
  id: string;
  name: string;
  role?: string;
  seniority?: string;
  meetingType: string;
  kind: string;
  note?: string;
  expect: { verdict: string; hard_fails: string[] };
  answerCount: number;
  lastRerun: RerunSummary | null;
}

export interface CellText {
  /** What the cell says. */
  label: string;
  /** Tone drives the colour class: muted for "nothing yet", ok/bad once graded. */
  tone: "muted" | "ok" | "bad";
}

/** Adversarial cases carry a chip so a red one is never mistaken for a plain bug. */
export function kindChip(kind: string): string {
  return kind === "adversarial" ? "adversarial" : "";
}

/** "Never rerun" until a rerun puts a date here. */
export function lastRerunCell(c: BoardCase, formatDate: (at: number) => string): CellText {
  const at = c.lastRerun?.finishedAt;
  if (!at) return { label: "Never rerun", tone: "muted" };
  return { label: formatDate(at), tone: "ok" };
}

/**
 * The trust cell: what the free safety checks said about this rerun, measured
 * against the baseline the case ratified. A run whose grading failed says so
 * rather than implying a pass it never earned.
 */
export function trustCell(c: BoardCase): CellText {
  if (!c.lastRerun) return { label: "·", tone: "muted" };
  const g = c.lastRerun.grade;
  if (!g?.actual?.verdict) return { label: "Not graded", tone: "muted" };
  if (g.regressed) return { label: "Regressed", tone: "bad" };
  return { label: "OK", tone: "ok" };
}

/** The named checks that broke, so a red row is never just a colour. */
export function trustDetail(c: BoardCase): string[] {
  const g = c.lastRerun?.grade;
  if (!g?.regressed) return [];
  const named = g.newHardFails?.length ? g.newHardFails : g.actual?.hard_fails || [];
  if (named.length) return named;
  // Regressed on verdict alone: say what moved, or the row explains nothing.
  const from = g.expected?.verdict || "?";
  const to = g.actual?.verdict || "?";
  return [`verdict went from ${from} to ${to}`];
}

/** Warn when a case ran out of canned answers, rather than degrading silently. */
export function thinAnswerNote(c: BoardCase): string {
  if (!c.lastRerun?.grade?.answersRanOut) return "";
  return `This case has ${c.answerCount} canned answers but the meeting asked for more, so the last few turns were skipped.`;
}

/** What the AI reviewer said: a score out of 5, and whether it moved. */
export function committeeCell(c: BoardCase): CellText {
  if (!c.lastRerun) return { label: "·", tone: "muted" };
  const j = c.lastRerun.judge;
  if (!j || j.unavailable) return { label: "Not scored", tone: "muted" };
  if (typeof j.score !== "number") return { label: "Not scored", tone: "muted" };

  const overall = j.head_to_head?.overall;
  if (!overall) return { label: `${j.score}/5`, tone: "muted" };
  const arrow = overall === "improved" ? "better" : overall === "worse" ? "worse" : "same";
  const tone = overall === "improved" ? "ok" : overall === "worse" ? "bad" : "muted";
  return { label: `${j.score}/5 ${arrow}`, tone };
}

/** The reviewer's one-line reason, plus anything it flagged. */
export function committeeDetail(c: BoardCase): string {
  const j = c.lastRerun?.judge;
  if (!j || j.unavailable) return "";
  if (!j.head_to_head) return j.flags?.length ? j.flags.join(". ") : "First rerun, nothing to compare with yet.";
  return [j.head_to_head.reason, ...(j.flags || [])].filter(Boolean).join(". ");
}

/** Carl's own review status, straight off the run's review sidecar. */
export function reviewCell(c: BoardCase): CellText {
  if (!c.lastRerun) return { label: "·", tone: "muted" };
  const r = c.lastRerun.review;
  const status = r?.reviewStatus;
  if (!status || status === "none") return { label: "Not reviewed", tone: "muted" };
  if (status === "partial") return { label: "Part-reviewed", tone: "muted" };
  const overall = r?.reviewOverall;
  if (overall === "keep") return { label: "Keep", tone: "ok" };
  if (overall === "fix") return { label: "Fix", tone: "bad" };
  if (overall === "block") return { label: "Block", tone: "bad" };
  return { label: "Reviewed", tone: "muted" };
}

/** What the Rerun button says. Cost is always stated on the control itself.
 *  Grounded in a real measurement: the first rerun (a bi-weekly, 6 calls) cost
 *  $0.11; the judge adds roughly $0.04, and the longest arcs run further. */
export function rerunLabel(canRerun: boolean): string {
  return canRerun ? "Rerun (~$0.25)" : "Reruns are off here";
}

/** Which of the batch's cases is going, in the words a person would use. */
export function batchProgressLine(job: {
  caseId?: string | null;
  caseIndex?: number | null;
  caseTotal?: number | null;
}): string {
  if (!job.caseId) return "";
  const many = (job.caseTotal || 1) > 1;
  return many ? `Case ${job.caseIndex} of ${job.caseTotal}: ${job.caseId}` : job.caseId;
}

/** One plain line under the heading, so the screen explains itself with no runs on it. */
export function boardSummary(cases: BoardCase[]): string {
  if (!cases.length) return "No test cases found.";
  const never = cases.filter((c) => !c.lastRerun).length;
  if (never === cases.length) return `${cases.length} test cases, none rerun yet.`;
  if (never === 0) return `${cases.length} test cases, all rerun.`;
  return `${cases.length} test cases, ${never} not rerun yet.`;
}
