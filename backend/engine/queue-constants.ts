// Shared constants for the plan-turn queue pipeline. Kept in one place so the
// extracted gate / coverage / thread-follow modules and queue-manager agree
// without importing each other circularly.

export const ALLOWED_DELTAS = [-3, -1, 0, 1, 3];
export const MAX_QUEUE = 12;

// Questions minted at runtime (planner items, thread-follows) are run records,
// not bank material. They save under questions/_runtime/ so no later session
// can load them as candidates — a designer session once served another
// scenario's "retry logic" follow-up straight from the pool root (Jun 02-04).
export const RUNTIME_SUBDIR = "_runtime";
