import { STAGES } from "../state.js";

// After a manager finishes a run, land on that person's page when the run is tied to a roster
// person — the saved briefing and the new top-placed "prep next 1:1" button both live there,
// so the loop closes on the person rather than on generic Home. Old runs and free-text intakes
// carry no personId, so those fall back to Home. (audit X5)
export function finishDestination(
  personId: string | null | undefined,
): { stage: string; personKey?: string } {
  if (personId) return { stage: STAGES.PERSON_DETAIL, personKey: personId };
  return { stage: STAGES.START };
}
