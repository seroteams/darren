// Runtime wiring for guided sessions (monthly-checkin Phase 5). The service module stays
// model-free — its wrap-up boundary defaults to a rejecting stub, so service unit tests never
// touch a model. THIS file injects the real engine call, so the live API can draft the AI
// wrap-up. Mirrors backend/api/services/sessions/session-runtime.ts.

import { createGuidedSessionsService, type GuidedWrapupFn } from "./guided-sessions.service.ts";
import { generateGuidedWrapup } from "../../../engine/guided/wrapup.ts";

const wrapup: GuidedWrapupFn = (input, session) => generateGuidedWrapup(input, { session });

/** The live singleton the controller uses — real repos + the real AI wrap-up. */
export const guidedSessionsService = createGuidedSessionsService(
  undefined,
  undefined,
  undefined,
  undefined,
  wrapup,
);
