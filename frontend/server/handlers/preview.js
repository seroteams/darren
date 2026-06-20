// Read-only preview of the exact text the CURRENT stage is about to send to the
// model — assembled with ZERO API calls, so nothing leaves the machine unseen.
// Reuses the same assembly code the live run uses, so the preview can never
// drift from what actually gets sent (engine honesty). GET /api/preview?s=<id>.
const { requireSession, inferStage } = require("../sessions");
const { assemblePreparation } = require("../../../src/preparation");
const { buildPreparationInputs } = require("./preparation");

// stage -> assemble its payload from a live session. Each returns
// { label, model, prompt } or throws a 409 when inputs aren't ready yet.
// Phase 1: Preparation only. Other stages are added one at a time.
const ASSEMBLERS = {
  PREPARATION(session) {
    if (!session.focusPointsResult) {
      throw Object.assign(new Error("Focus points not ready for this stage yet"), { status: 409 });
    }
    return { label: "Prep brief", ...assemblePreparation(buildPreparationInputs(session)) };
  },
};

module.exports = function preview(c) {
  const session = requireSession(c.query.s);
  const stage = String(c.query.stage || inferStage(session)).toUpperCase();
  const assemble = ASSEMBLERS[stage];
  if (!assemble) return c.json(200, { stage, supported: false });
  const { label, model, prompt } = assemble(session);
  c.json(200, { stage, label, model, prompt, preview: true });
};
