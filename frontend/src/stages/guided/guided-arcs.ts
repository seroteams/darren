// The guided-arc registry — the extensibility seam (architecture.md §2b).
// One entry per guided arc. The runner reads arc.stages and renders each stage from
// the shared stage library; it never hardcodes the 7 stages or their order. Adding
// "Quarterly review" later = a new entry here that reuses existing stage renderers,
// not a runner rewrite. This is deliberately tiny — NOT a framework.

import type { GuidedArc } from "./guided.types.ts";

export const GUIDED_ARCS: GuidedArc[] = [
  {
    slug: "monthly_check_in",
    label: "Monthly Check-in",
    badge: "New",
    stages: ["catchup", "requests", "rating", "feedback", "goals", "summary", "wrapup"],
    aiWrapup: true,
  },
];

export const DEFAULT_GUIDED_ARC = GUIDED_ARCS[0];

/** Resolve the arc a session follows; falls back to the default (v1 has one arc). */
export function arcBySlug(slug: string | undefined): GuidedArc {
  return GUIDED_ARCS.find((a) => a.slug === slug) ?? DEFAULT_GUIDED_ARC;
}
