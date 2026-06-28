// Pure input-builder for the preparation stage, moved verbatim from the old
// handlers/preparation.ts when the preparation stream converted to clean layers
// (S4). Maps live session state to the inputs generatePreparation expects, and is
// shared with the preview read (S1b) so what's previewed is exactly what gets
// sent (engine honesty). No storage, no req/res — it only shapes inputs.

import { getSessionSelectedFocus } from "../../selected-focus.ts";
import type { Session } from "../../../shared/session.types.ts";

function buildPreparationInputs(session: Session) {
  if (!session.focusPointsResult) {
    throw Object.assign(new Error("Focus points not ready"), { status: 409 });
  }
  const selectedFocus = getSessionSelectedFocus(session);
  return {
    ...session.ctx,
    focusPoints: session.focusPointsResult.focus_points,
    selectedFocus,
    primaryFocusId: selectedFocus?.id,
  };
}

export { buildPreparationInputs };
