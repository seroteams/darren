// Pure row projection for the Regression board. No DOM, no fetch — everything
// here is a value in, a value out, so the table's wording is unit-testable.
//
// Phase 1 only needs the "never rerun" states; the trust / committee / review
// cells arrive in Phases 2-4 and slot into the same shape.

export interface RerunSummary {
  runId: string;
  batchId: string;
  finishedAt: string | null;
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

/** "Never rerun" until Phase 2 puts a date here. */
export function lastRerunCell(c: BoardCase, formatDate: (iso: string) => string): CellText {
  const at = c.lastRerun?.finishedAt;
  if (!at) return { label: "Never rerun", tone: "muted" };
  return { label: formatDate(at), tone: "ok" };
}

/**
 * The trust cell. Phase 1 has no verdicts yet, so an un-rerun case shows a
 * placeholder rather than implying a pass it has not earned.
 */
export function trustCell(c: BoardCase): CellText {
  if (!c.lastRerun) return { label: "·", tone: "muted" };
  return { label: "Awaiting grading", tone: "muted" };
}

/** The AI reviewer cell. Same honesty rule as trustCell until Phase 3. */
export function committeeCell(c: BoardCase): CellText {
  if (!c.lastRerun) return { label: "·", tone: "muted" };
  return { label: "Awaiting grading", tone: "muted" };
}

/** Carl's own review status. Filled from the run's review sidecar in Phase 4. */
export function reviewCell(c: BoardCase): CellText {
  if (!c.lastRerun) return { label: "·", tone: "muted" };
  return { label: "Not reviewed", tone: "muted" };
}

/** What the Rerun button says. Cost is always stated on the control itself. */
export function rerunLabel(canRerun: boolean): string {
  return canRerun ? "Rerun ($0.45)" : "Reruns are off here";
}

/** One plain line under the heading, so the screen explains itself with no runs on it. */
export function boardSummary(cases: BoardCase[]): string {
  if (!cases.length) return "No test cases found.";
  const never = cases.filter((c) => !c.lastRerun).length;
  if (never === cases.length) return `${cases.length} test cases, none rerun yet.`;
  if (never === 0) return `${cases.length} test cases, all rerun.`;
  return `${cases.length} test cases, ${never} not rerun yet.`;
}
