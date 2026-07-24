// Shared label helpers for the Pulse dashboard and its drill-down list pages
// (pulse-drilldowns) — one place to prettify raw meeting_type / stage codes and
// timestamps, so the tiles and their list pages can never label the same run
// differently.

import { relTime, formatDate } from "./time.ts";
import { breadcrumb } from "./breadcrumb.ts";

const TYPE_LABELS: Record<string, string> = {
  first: "First 1:1", biweekly: "Bi-weekly", "bi-weekly": "Bi-weekly", weekly: "Weekly",
  monthly: "Monthly", "feels-off": "Feels-off", feels_off: "Feels-off", performance: "Performance",
};
export const prettyType = (t: string): string =>
  TYPE_LABELS[t.toLowerCase()] ?? (t.charAt(0).toUpperCase() + t.slice(1));

const STAGE_LABELS: Record<string, string> = {
  intake: "Setting up", focus_points: "Focus", focus: "Focus",
  preparation: "Prep", bank: "Questions", questioning: "Questions", questions: "Questions",
  eval: "Evaluate", briefing: "Recap", run_debrief: "Debrief", debrief: "Debrief",
};
export const prettyStage = (s: string): string =>
  STAGE_LABELS[s.toLowerCase()] ?? (s.charAt(0).toUpperCase() + s.slice(1));

export const activeLabel = (v: string | number | null): string => {
  if (v == null) return "no runs yet";
  const ms = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(ms) ? relTime(ms) : "no runs yet";
};

export const dateLabel = (v: string | number | null): string => {
  if (v == null) return "–";
  const ms = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(ms) ? formatDate(ms) : "–";
};

/** The drill-down pages' way up (design-consolidation P5, Breadcrumb Rule): the
 *  shared trail replaces the old circled Back. Every page routes `.js-crumb`
 *  clicks with data-nav="pulse" to the Pulse dashboard. */
export const pulseCrumbs = (current: string): string =>
  breadcrumb([{ label: "Pulse", nav: "pulse" }, { label: current }]);
