// Where the intake flow opens. A person already on the roster was *picked* — we hold their
// personId and name — so they've been identified; skip re-asking name/role/seniority and open at
// the meeting type ("then what does Sero need to know" follows). A brand-new free-text name has
// nothing on record yet, so it still starts at NAME. (audit QA follow-up, folded into Phase 1)
export function prepStartSubstage(
  seed: { personId?: string | null; name?: string | null },
): "NAME" | "MEETING_TYPE" {
  const identified = Boolean(seed.personId && (seed.name ?? "").trim());
  return identified ? "MEETING_TYPE" : "NAME";
}
