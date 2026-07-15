// Shared label helpers for the Pulse dashboard and its drill-down list pages
// (pulse-drilldowns) — one place to prettify raw meeting_type / stage codes and
// timestamps, so the tiles and their list pages can never label the same run
// differently.

import { relTime, formatDate } from "./time.ts";

const TYPE_LABELS: Record<string, string> = {
  first: "First 1:1", biweekly: "Bi-weekly", "bi-weekly": "Bi-weekly", weekly: "Weekly",
  monthly: "Monthly", "feels-off": "Feels-off", feels_off: "Feels-off", performance: "Performance",
};
export const prettyType = (t: string): string =>
  TYPE_LABELS[t.toLowerCase()] ?? (t.charAt(0).toUpperCase() + t.slice(1));

const STAGE_LABELS: Record<string, string> = {
  intake: "Setting up", onepage: "Setting up", focus_points: "Focus", focus: "Focus",
  preparation: "Prep", bank: "Questions", questioning: "Questions", questions: "Questions",
  eval: "Evaluate", briefing: "Briefing", run_debrief: "Debrief", debrief: "Debrief",
};
export const prettyStage = (s: string): string =>
  STAGE_LABELS[s.toLowerCase()] ?? (s.charAt(0).toUpperCase() + s.slice(1));

export const activeLabel = (v: string | number | null): string => {
  if (v == null) return "no runs yet";
  const ms = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(ms) ? relTime(ms) : "no runs yet";
};

export const dateLabel = (v: string | number | null): string => {
  if (v == null) return "—";
  const ms = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(ms) ? formatDate(ms) : "—";
};

/** The drill-down pages' back control (pulse-drilldowns): a circled ‹ plus "Back",
 *  shown at the top and repeated at the bottom left of each list (Carl's call
 *  2026-07-15). Styling in styles/pulse-drilldowns.css; every page routes
 *  `.js-back-pulse` clicks to the Pulse dashboard. */
export const backToPulse = (): string =>
  `<button type="button" class="pd-back js-back-pulse" aria-label="Back to Live pulse"><span class="pd-back__circle" aria-hidden="true">‹</span>Back</button>`;
