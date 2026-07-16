// Axis memory for a person's page (axis-memory Phase 2).
//
// The four health scores across a person's last few finished 1:1s, shown to the
// manager as a trend (oldest → newest) — clearly-labelled PAST context, NEVER
// merged into the current session's live scoring. Honesty rule: only a session
// that actually read an axis contributes a point; an axis never read in any of
// them shows "not read", never a 0 it didn't earn. Kept in its own module (no
// browser imports) so the render logic is pure and node-testable.

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

function fmt(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

// Render the per-axis memory block. `axesPerRun` is the axes array from each of
// the person's recent 1:1s, ORDERED OLDEST → NEWEST, so a trend reads left to
// right. Returns "" when no axis was ever read (no empty scaffold).
export function renderAxisMemory(axesPerRun: Array<AxisRead[] | null | undefined>): string {
  const runs = Array.isArray(axesPerRun) ? axesPerRun : [];
  const rows: string[] = [];
  let anyRead = false;
  for (const id of AXIS_ORDER) {
    const points: string[] = [];
    for (const axes of runs) {
      const a = Array.isArray(axes) ? axes.find((x) => x && x.id === id) : null;
      if (a && a.read_status === "read" && typeof a.score === "number") {
        points.push(fmt(a.score));
      }
    }
    const label = escapeHtml(AXIS_LABELS[id] || id);
    if (points.length === 0) {
      rows.push(
        `<div class="axis-mem__row"><span class="axis-mem__axis">${label}</span><span class="axis-mem__nr">not read</span></div>`,
      );
      continue;
    }
    anyRead = true;
    const series = points
      .map((p) => `<b>${escapeHtml(p)}</b>`)
      .join(`<span class="axis-mem__arrow" aria-hidden="true"> → </span>`);
    rows.push(
      `<div class="axis-mem__row"><span class="axis-mem__axis">${label}</span><span class="axis-mem__series">${series}</span></div>`,
    );
  }
  if (!anyRead) return "";
  return `<div class="axis-mem">${rows.join("")}</div>`;
}
