// Shared constants + types for the plan-turn queue pipeline. Kept in one place so
// the extracted gate / coverage / thread-follow modules and queue-manager agree
// without importing each other circularly.
import { getArc } from "./meeting-arcs.ts";
import type { QuestionPurpose } from "../shared/question.types.ts";

// The arc-shaped view getArc returns (slug/tone_register/arc/anti_patterns).
export type Arc = ReturnType<typeof getArc>;

export const ALLOWED_DELTAS = [-3, -1, 0, 1, 3];
export const MAX_QUEUE = 12;

// Questions minted at runtime (planner items, thread-follows) are run records,
// not bank material. They save under questions/_runtime/ so no later session
// can load them as candidates — a designer session once served another
// scenario's "retry logic" follow-up straight from the pool root (Jun 02-04).
export const RUNTIME_SUBDIR = "_runtime";

// A raw queue item as the planner emits it on the wire (axis_effects is an
// array here; toAxisObject converts it). All fields are permissive because the
// reconcile/coverage code reads them defensively.
export interface RawQueueItem {
  ref_alias?: string | null;
  label?: string;
  name?: string;
  description?: string;
  purpose?: QuestionPurpose;
  stage?: string | null;
  axis_effects?: AxisEffect[];
  grounding?: string;
}

// One {axis, delta} pair on the wire.
export interface AxisEffect {
  axis: string;
  delta: number;
}
