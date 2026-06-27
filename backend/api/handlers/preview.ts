// Read-only preview of the exact text the CURRENT stage is about to send to the
// model — assembled with ZERO API calls, so nothing leaves the machine unseen.
// Reuses the same assembly code the live run uses, so the preview can never
// drift from what actually gets sent (engine honesty). GET /api/preview?s=<id>.
import { requireSession, inferStage } from "../sessions.ts";
import { assemblePreparation } from "../../engine/preparation.ts";
import { buildPreparationInputs } from "./preparation.ts";
import type { RequestContext } from "../router.ts";
import type { Session } from "../../shared/session.types.ts";

// stage -> assemble its payload from a live session. Each returns
// { label, model, prompt } or throws a 409 when inputs aren't ready yet.
// Phase 1: Preparation only. Other stages are added one at a time.
const ASSEMBLERS: Record<string, (session: Session) => { label: string } & ReturnType<typeof assemblePreparation>> = {
  PREPARATION(session) {
    if (!session.focusPointsResult) {
      throw Object.assign(new Error("Focus points not ready for this stage yet"), { status: 409 });
    }
    return { label: "Prep brief", ...assemblePreparation(buildPreparationInputs(session)) };
  },
};

export default function preview(c: RequestContext): void {
  const session = requireSession(c.query.s ?? "");
  const stage = String(c.query.stage || inferStage(session)).toUpperCase();
  const assemble = ASSEMBLERS[stage];
  if (!assemble) return c.json(200, { stage, supported: false });
  const { label, model, prompt } = assemble(session);
  c.json(200, { stage, label, model, prompt, preview: true });
}
