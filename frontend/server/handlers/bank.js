const { requireSession } = require("../sessions");
const { runStage } = require("./stream-helper");
const { generateBankWithFallback } = require("../../../src/question-generator");
const { selectReservedCloser } = require("../../../src/closer");
const { getSessionSelectedFocus } = require("../selected-focus");
const { loadPersona, scriptedQuestions } = require("../persona-script");

module.exports = async function bank(c) {
  const session = requireSession(c.query.s);
  if (!session.focusPointsResult) {
    return c.error(Object.assign(new Error("focus points not ready"), { status: 409 }));
  }

  await runStage(c, session, "bank", {
    thinkingLabel: session.mode === "scripted" ? "Loading scripted question path" : "Generating question bank",
    getCached: () => (session.bankReady ? { count: session.bankReady.count } : null),
    setCached: (payload) => {
      session.bankReady = payload;
    },
    produce: async () => {
      // Scripted test lane: freeze the question path. Skip live bank generation
      // and load the persona's fixed script as the entire queue, so the only
      // variable between runs is the prompt stage under test. No closer to
      // force-insert — the script defines the exact, ordered path.
      if (session.mode === "scripted") {
        const persona = loadPersona(session.fingerprint?.personaId);
        const scripted = persona ? scriptedQuestions(persona) : [];
        if (scripted.length) {
          session.queueRef = scripted;
          session.totalBudget = scripted.length;
          session.closer = null;
          return { count: scripted.length };
        }
      }

      const selectedFocus = getSessionSelectedFocus(session);
      const bankItems = await generateBankWithFallback(
        {
          focusPoints: session.focusPointsResult.focus_points,
          ...session.ctx,
          selectedFocus,
          primaryFocusId: selectedFocus?.id,
          existingQueue: session.introQueue,
        },
        { session: { id: session.id, dir: session.dir } },
        { onFallback: (e) => console.warn("[bank] generation failed, falling back to _seed:", e.message) }
      );
      session.queueRef = [...session.introQueue, ...bankItems];

      // Reserve the closer: last bank item tagged with the arc's final stage.
      // plan.js force-inserts this at queueRef[0] when turn + 1 === totalBudget,
      // so the planner can't accidentally drop or rewrite it.
      session.closer = selectReservedCloser(bankItems, session.ctx.meetingType);

      return { count: bankItems.length };
    },
    resultEvent: "ready",
    buildPayload: (r) => ({ count: r.count }),
  });
};
