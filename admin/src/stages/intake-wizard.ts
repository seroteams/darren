// Intake wizard helpers (design-consolidation Phase 3). The intake substages
// share the one wizard footer (ui/wizard-footer.ts): Back walks real history,
// and entering mid-flow (e.g. Back from Focus lands on NOTES) seeds that
// history with the steps that logically came before the entry step.

export const INTAKE_SUBSTAGES = ["NAME", "ROLE", "SENIORITY", "MEETING_TYPE", "NOTES"] as const;
export type IntakeSubstage = (typeof INTAKE_SUBSTAGES)[number];

// The substages a Back press should walk through from `sub`, oldest first.
// A roster-picked person skipped ROLE and SENIORITY on the way in (their
// details are already known), so their trail skips them too. Unknown input
// gets an empty trail: no Back, never a crash.
export function backTrail(sub: string, hasRosterPick: boolean): IntakeSubstage[] {
  const idx = INTAKE_SUBSTAGES.indexOf(sub as IntakeSubstage);
  if (idx <= 0) return [];
  const prior = INTAKE_SUBSTAGES.slice(0, idx);
  return hasRosterPick ? prior.filter((s) => s !== "ROLE" && s !== "SENIORITY") : [...prior];
}
