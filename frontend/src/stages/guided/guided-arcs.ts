// The guided-arc registry — the extensibility seam (architecture.md §2b). A guided arc
// is DATA, not code: an ordered list of stage ids. The runner reads its stages from here
// and NEVER hardcodes the 7 stages or their order, so a second arc ("Quarterly review",
// "Onboarding guided", …) is a new GUIDED_ARCS entry reusing the SAME stage components —
// not a runner rewrite. This is not extra work: Monthly Check-in has to be built
// stage-driven anyway; the discipline is simply not hardcoding the list.

export type GuidedStageId =
  | "catchup"
  | "requests"
  | "rating"
  | "feedback"
  | "goals"
  | "summary"
  | "wrapup";

export interface GuidedArc {
  slug: string;
  label: string;
  badge?: string;
  /** Ordered — THIS is the arc. The runner drives its pill nav + stage machine from it. */
  stages: GuidedStageId[];
  /** Whether the end-of-session AI wrap-up call fires (Phase 5). */
  aiWrapup: boolean;
}

export const GUIDED_ARCS: GuidedArc[] = [
  {
    slug: "monthly_check_in",
    label: "Monthly Check-in",
    badge: "New",
    stages: ["catchup", "requests", "rating", "feedback", "goals", "summary", "wrapup"],
    aiWrapup: true,
  },
];

/** v1 has one guided arc; every guided session is a Monthly Check-in. When a session
 *  carries its own slug (a later phase), resolve it here instead. */
export const DEFAULT_GUIDED_ARC: GuidedArc = GUIDED_ARCS[0]!;
