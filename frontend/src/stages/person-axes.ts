// Axis memory for a person's page (axis-memory Phase 2, re-skinned by
// design-consolidation Phase 1, M5).
//
// The four health scores across a person's last few finished 1:1s, shown to the
// manager as clearly-labelled PAST context, NEVER merged into the current
// session's live scoring. The CURRENT (newest) read renders as the shared axis
// bar; older reads ride below it as a quiet text suffix (oldest → newest).
// The shared component (admin/src/ui/axes.js) needs a DOM and a window at module
// scope, so this module replicates its exact classes (.axis / .axis__track /
// .axis__fill…) as a pure string instead of importing it — the render logic
// stays node-testable. Honesty rule: only a session that actually read an axis
// contributes a point; an axis never read in any of them shows "not read",
// never a bar or a 0 it didn't earn.

import { escapeHtml } from "../../../admin/src/ui/html.js";

export const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];

const AXIS_LABELS: Record<string, string> = {
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  clarity: "Clarity",
  growth: "Growth",
};

// Visual scale clamps to ±6 (mirrors admin/src/ui/axes.js); true scores pass through.
const VISUAL_MAX = 6;

// One axis as it rides on a stored briefing (backend `briefing.axes`). score is
// null when the axis wasn't read; read_status is the authoritative flag.
export type AxisRead = { id?: string; score?: number | null; read_status?: string };

function fmt(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

// The shared axis bar, static: the same markup axes.js's createRow builds and
// setScoreInstant fills, minus the animation hooks this read-only page never uses.
function bar(id: string, label: string, score: number): string {
  const clamped = Math.max(-VISUAL_MAX, Math.min(VISUAL_MAX, score));
  const ratio = Number((Math.abs(clamped) / VISUAL_MAX).toFixed(3));
  const dir = score > 0 ? "axis__fill--positive" : "axis__fill--negative";
  const offscale = Math.abs(score) > VISUAL_MAX ? `<span class="axis__offscale">(off-scale)</span>` : "";
  return (
    `<div class="axis" data-axis="${escapeHtml(id)}">` +
    `<div class="axis__label">${label}</div>` +
    `<div class="axis__track" role="meter" aria-valuemin="-6" aria-valuemax="6" aria-valuenow="${score}" aria-label="${label} score">` +
    `<div class="axis__midline"></div>` +
    `<div class="axis__fill ${dir}" style="transform: scaleX(${ratio})"></div>` +
    `</div>` +
    `<div class="axis__value num-tabular">${escapeHtml(fmt(score))}${offscale}</div>` +
    `</div>`
  );
}

// Render the per-axis memory block. `axesPerRun` is the axes array from each of
// the person's recent 1:1s, ORDERED OLDEST → NEWEST, so the suffix reads left to
// right. Returns "" when no axis was ever read (no empty scaffold).
export function renderAxisMemory(axesPerRun: Array<AxisRead[] | null | undefined>): string {
  const runs = Array.isArray(axesPerRun) ? axesPerRun : [];
  const rows: string[] = [];
  let anyRead = false;
  for (const id of AXIS_ORDER) {
    const points: number[] = [];
    for (const axes of runs) {
      const a = Array.isArray(axes) ? axes.find((x) => x && x.id === id) : null;
      if (a && a.read_status === "read" && typeof a.score === "number") points.push(a.score);
    }
    const label = escapeHtml(AXIS_LABELS[id] || id);
    if (points.length === 0) {
      // Unread axes keep the bar's grid (label column + a quiet note) but never fake a meter.
      rows.push(
        `<div class="axis" data-axis="${escapeHtml(id)}"><div class="axis__label">${label}</div><span class="axis-mem__nr">not read</span></div>`,
      );
      continue;
    }
    anyRead = true;
    const current = points[points.length - 1]!;
    let row = bar(id, label, current);
    if (points.length > 1) {
      const series = points.map((p) => escapeHtml(fmt(p))).join(" → ");
      row += `<div class="axis-mem__nr">last ${points.length} reads: ${series}</div>`;
    }
    rows.push(row);
  }
  if (!anyRead) return "";
  return `<div class="l-stack l-stack--1">${rows.join("")}</div>`;
}
