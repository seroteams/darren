// Back-compat shim. The arc/Type data now lives in src/one-on-one-types/<slug>/type.js,
// resolved by the registry there. This module re-exports the arc-shaped accessors so
// existing consumers (getArc / listStageIds / MEETING_ARCS) keep working unchanged.
//
// New code should require("./one-on-one-types") and use getType / listTypes.

export { MEETING_ARCS, getArc, listStageIds, arcBudget, arcBudgetDefault } from "./one-on-one-types/index.ts";
