import { requireSession } from "../sessions.ts";
import { runStage } from "./stream-helper.ts";
import { generateFocusPoints } from "../../engine/generate.ts";
import type { RequestContext } from "../router.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

export default async function focusPoints(c: RequestContext): Promise<void> {
  const session = requireSession(c.query.s ?? "");
  const force = c.query.regenerate === "1" || c.query.regenerate === "true";
  if (force) {
    session.focusPointsResult = null;
    const inFlight = session.inFlight.get("focus-points");
    if (isObjectRecord(inFlight) && inFlight.controller instanceof AbortController) {
      inFlight.controller.abort();
      session.inFlight.delete("focus-points");
    }
  }

  await runStage(c, session, "focus-points", {
    thinkingLabel: "Choosing focus points",
    getCached: () => session.focusPointsResult,
    setCached: (r) => { session.focusPointsResult = r; },
    produce: () => generateFocusPoints(session.ctx, { session: { id: session.id, dir: session.dir } }),
    resultEvent: "result",
    buildPayload: (r) => ({ meeting_type: r.meeting_type, focus_points: r.focus_points }),
  });
}
