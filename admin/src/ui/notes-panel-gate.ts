// Visibility rule for the notes panel (QA notes + Sending/Received/Rules tabs).
// It is internal QA tooling: ONLY the internal `admin` role sees it, and only
// while actually doing a run (a live session on a flow stage). Guests, members
// and managers never see it (Carl, 2026-07-06). Kept as a pure, DOM-free
// predicate so it can be unit-tested; notes-panel.js applies it on every render.

import { isInternalAdmin } from "../state.js";
import { isFlowStage } from "../router.js";

export interface NotesPanelState {
  user?: unknown;
  sessionId?: string | null;
  stage?: string;
}

export function notesPanelVisible(state: NotesPanelState | null | undefined): boolean {
  return Boolean(
    state
    && isInternalAdmin(state.user)
    && state.sessionId
    && isFlowStage(state.stage),
  );
}
