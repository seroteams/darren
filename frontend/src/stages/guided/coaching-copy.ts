// Static coaching copy + per-stage UI metadata for the guided runner. Durable content
// (survives past Phase 1's mock trackers): the pill-nav labels/icons, each stage's big title
// + subtitle, the sequential feedback questions, and the six rating blocks. Ported from the
// approved prototype; person-neutral pronouns (the real person's gender is unknown).

import type { GuidedStageId } from "./guided.types.ts";

/** Interpolation context — the real roster person + this session's counts. */
export interface CopyCtx {
  name: string; // "Aisha"
  full: string; // "Aisha Rahman" (Phase 1: same as name)
  requestCount: number;
  goalCount: number;
}

/** Pill-nav label + icon key (see guided-icons.ts) per stage. */
export const STAGE_UI: Record<GuidedStageId, { label: string; icon: string }> = {
  catchup: { label: "Catch-up", icon: "chat" },
  requests: { label: "Requests", icon: "inbox" },
  rating: { label: "Rating", icon: "star" },
  feedback: { label: "Feedback", icon: "bubble" },
  goals: { label: "Goals", icon: "target" },
  summary: { label: "Summary", icon: "doc" },
  wrapup: { label: "Review", icon: "clip" },
};

/** The big stage title + subtitle. */
export function stageCopy(id: GuidedStageId, ctx: CopyCtx): { title: string; sub: string } {
  switch (id) {
    case "catchup":
      return {
        title: "A quick catch-up to start things off",
        sub: "Start where you left off. How did last month's promises go?",
      };
    case "requests":
      return {
        title: `${ctx.name} has ${ctx.requestCount} ${ctx.requestCount === 1 ? "thing" : "things"} to discuss`,
        sub: "Open any request. Talk through priorities, blockers and next steps in the side panel.",
      };
    case "rating":
      return {
        title: "Building block ratings",
        sub: `Ask ${ctx.full} to rate how they feel about each area. They say the number out loud, you type it in. The marker shows last month.`,
      };
    case "feedback":
      return {
        title: "Looking to the future",
        sub: `${ctx.full}'s chance to share what they'd like more of, less of, and what they want to learn. One at a time.`,
      };
    case "goals":
      return {
        title: `Review ${ctx.goalCount} ${ctx.goalCount === 1 ? "goal" : "goals"} together`,
        sub: "Click a goal to open it. Discuss progress, blockers, and celebrate wins in the side panel.",
      };
    case "summary":
      return {
        title: "Your 1:1 summary",
        sub: "Sero drafts this from everything above and your last check-in. Read it together, tweak anything, and it's saved.",
      };
    case "wrapup":
      return {
        title: "Your private review",
        sub: `Once ${ctx.name} leaves, a quiet moment for your own read. None of this is ever shared with them.`,
      };
  }
}

/** The three sequential feedback prompts. `key` maps to state.feedback.<key>. */
export interface FeedbackQuestion {
  key: "lessOf" | "moreOf" | "learn";
  tag: string;
  stem: (ctx: CopyCtx) => string;
  coach: string;
}
export const FEEDBACK: FeedbackQuestion[] = [
  {
    key: "lessOf",
    tag: "Less of",
    stem: (c) => `What would ${c.name} like less of?`,
    coach:
      "What drains their energy: tasks, meetings, interruptions? Listen for patterns that might point to something systemic.",
  },
  {
    key: "moreOf",
    tag: "More of",
    stem: (c) => `What would ${c.name} like more of?`,
    coach: "More ownership, more feedback, more pairing time? Ask what it would unlock for them.",
  },
  {
    key: "learn",
    tag: "Learn",
    stem: (c) => `What does ${c.name} want to learn?`,
    coach: "A skill, a tool, a role to shadow. Tie it into the goals stage next.",
  },
];

// ── Tracker vocab (Phase 2) — the human labels + select options for the real statuses ──
/** Catch-up promise outcome chips → the value stored in state.catchup.outcomes[promiseId]. */
export const OUTCOMES: { value: string; label: string }[] = [
  { value: "yes", label: "Done" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "Not done" },
  { value: "changed", label: "Changed" },
];
/** Machine status → human label (across all three kinds). */
export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  not_started: "Not started",
  done: "Done",
  partly: "Partly",
  not_done: "Not done",
  changed: "Changed",
};
export const CATEGORY_LABELS: Record<string, string> = {
  growth_development: "Growth & development",
  ideas_suggestions: "Ideas & suggestions",
  concerns_feedback: "Concerns & feedback",
};
/** [value, label] select options for the side-panel edit forms. */
export const REQUEST_STATUS_OPTIONS: [string, string][] = [
  ["new", "New"],
  ["in_progress", "In progress"],
  ["resolved", "Resolved"],
];
export const GOAL_STATUS_OPTIONS: [string, string][] = [
  ["not_started", "Not started"],
  ["in_progress", "In progress"],
  ["done", "Done"],
];
export const CATEGORY_OPTIONS: [string, string][] = [
  ["growth_development", "Growth & development"],
  ["ideas_suggestions", "Ideas & suggestions"],
  ["concerns_feedback", "Concerns & feedback"],
];
/** A status → the .mcr-status--* CSS suffix (new | prog | done). */
export function statusClass(status: string): string {
  if (status === "done" || status === "resolved") return "done";
  if (status === "in_progress") return "prog";
  return "new";
}

/** The six building blocks. The last-time marker is real block_scores now (Phase 3), passed
 *  into the renderer per block — not stored here. */
export interface RatingBlock {
  id: string;
  label: string;
  icon: string;
}
export const RATING_BLOCKS: RatingBlock[] = [
  { id: "tasks", label: "Tasks", icon: "check" },
  { id: "processes", label: "Processes", icon: "flow" },
  { id: "team", label: "Our team", icon: "people" },
  { id: "development", label: "Development", icon: "trend" },
  { id: "fun", label: "Fun", icon: "smile" },
  { id: "fulfilment", label: "Fulfilment", icon: "heart" },
];
