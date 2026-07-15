// "Last 1:1" axis reads for a person's page (axis-memory Phase 1).
//
// The four health scores from the person's most recent finished 1:1, shown to
// the manager as clearly-labelled PAST context — NEVER merged into this
// session's live scoring. Honesty rule: an axis that wasn't read shows
// "not read", never a 0 it didn't earn. Kept in its own module (no browser
// imports) so the render logic is pure and node-testable.

import { escapeHtml } from "../../../admin/src/ui/html.js";

export const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];

const AXIS_LABELS: Record<string, string> = {
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  clarity: "Clarity",
  growth: "Growth",
};

// One axis as it rides on a stored briefing (backend `briefing.axes`). score is
// null when the axis wasn't read; read_status is the authoritative flag.
export type AxisRead = { id?: string; score?: number | null; read_status?: string };

// Returns the inner HTML for the "Last 1:1" axis line, or "" when no axis was
// actually read (so there's no empty scaffold). whenLabel is the pre-formatted
// "4 days ago" string — passed in so this stays free of any date/browser dep.
export function renderLastAxes(axes: AxisRead[] | undefined | null, whenLabel: string): string {
  if (!Array.isArray(axes)) return "";
  const cells: string[] = [];
  let anyRead = false;
  for (const id of AXIS_ORDER) {
    const a = axes.find((x) => x && x.id === id);
    if (!a) continue;
    const read = a.read_status === "read" && typeof a.score === "number";
    if (read) anyRead = true;
    const val = read ? (a.score! > 0 ? `+${a.score}` : `${a.score}`) : "not read";
    cells.push(
      `<span class="since-axes__cell"><span class="since-axes__axis">${escapeHtml(AXIS_LABELS[id] || id)}</span> <b>${escapeHtml(val)}</b></span>`,
    );
  }
  if (!anyRead) return "";
  const from = whenLabel
    ? `<span class="since-axes__from">Last 1:1 · ${escapeHtml(whenLabel)}</span>`
    : `<span class="since-axes__from">Last 1:1</span>`;
  return `<div class="since-axes">${from}${cells.join("")}</div>`;
}
