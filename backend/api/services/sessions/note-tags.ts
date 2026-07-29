// Engine bracket tags in the planner's note ([THREAD-DEFERRED-WINDDOWN],
// [SHALLOW], [BUDGET-STARVED], ... — the contract in content/prompts/plan-turn.md)
// are read downstream by delta-gates, read-quality and the lexicon review, so the
// stored turnEntry.note must stay raw. This strip runs at the stream boundary
// ONLY: the last hop before a note reaches a screen (user-test-fixes P1).
//
// Shape rule: an engine tag is ALL-CAPS inside square brackets. Anything with
// lowercase letters ("[sic]") is treated as the manager's own text and kept.

const ENGINE_TAG = /\s*[;,:]?\s*\[[A-Z][A-Z0-9_-]*\]/g;

export function stripEngineTags(note: string): string {
  const cleaned = note
    .replace(ENGINE_TAG, " ")
    .replace(/\s+([.;,!?])/g, "$1") // " ." left behind by a trailing tag → "."
    .replace(/\s{2,}/g, " ")
    .trim();
  // A note that was nothing but tags leaves only punctuation — show nothing.
  return /[a-zA-Z0-9]/.test(cleaned) ? cleaned : "";
}
