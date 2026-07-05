// Pure input-builder for the question-bank stage, mirroring the live bank stream
// (session-streams.ts) so what's previewed is exactly what gets sent (engine
// honesty). Shared with the preview read (S1b). No storage, no req/res — it only
// shapes inputs. Sibling of preparation-inputs.ts.

import { getSessionSelectedFocus } from "../../selected-focus.ts";
import type { Session } from "../../../shared/session.types.ts";

function buildBankInputs(session: Session) {
  if (!session.focusPointsResult) {
    throw Object.assign(new Error("Focus points not ready"), { status: 409 });
  }
  const selectedFocus = getSessionSelectedFocus(session);
  return {
    focusPoints: session.focusPointsResult.focus_points,
    ...session.ctx,
    selectedFocus,
    primaryFocusId: selectedFocus?.id,
    existingQueue: session.introQueue,
    prep: session.preparationResult?.brief || null,
  };
}

export { buildBankInputs };
