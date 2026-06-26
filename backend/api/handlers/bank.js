const { requireSession } = require("../sessions.ts");
const { runStage } = require("./stream-helper.ts");
const { generateBankWithFallback, assembleQueueWithPrepOpener, findPrepOpener } = require("../../engine/question-generator.ts");
const { selectReservedCloser } = require("../../engine/closer.ts");
const { getSessionSelectedFocus } = require("../selected-focus.ts");
const { loadPersona, scriptedQuestions } = require("../persona-script.ts");

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
          session.sessionBank = scripted;
          return { count: scripted.length };
        }
      }

      const selectedFocus = getSessionSelectedFocus(session);
      const prep = session.preparationResult?.brief || null;
      const bankItems = await generateBankWithFallback(
        {
          focusPoints: session.focusPointsResult.focus_points,
          ...session.ctx,
          selectedFocus,
          primaryFocusId: selectedFocus?.id,
          existingQueue: session.introQueue,
          prep,
        },
        { session: { id: session.id, dir: session.dir } },
        { onFallback: (e) => console.warn("[bank] generation failed, falling back to _seed:", e.message) }
      );
      session.queueRef = assembleQueueWithPrepOpener(session.introQueue, bankItems, prep, session.ctx.meetingType);
      session.prepOpener = prep ? findPrepOpener(bankItems) : null;

      // Reserve the closer: last bank item tagged with the arc's final stage.
      // plan.js force-inserts this at queueRef[0] when turn + 1 === totalBudget,
      // so the planner can't accidentally drop or rewrite it.
      session.closer = selectReservedCloser(bankItems, session.ctx.meetingType);

      // The legitimate question pool for THIS session (mirrors the CLI loop):
      // assembled queue + reserved prep-opener and closer. The planner's
      // coverage insertion pulls from here instead of the whole global bank,
      // so it can't surface another persona's saved question.
      const seenBankAliases = new Set();
      session.sessionBank = [];
      for (const item of [...session.queueRef, session.prepOpener, session.closer]) {
        if (item?.alias && !seenBankAliases.has(item.alias)) {
          seenBankAliases.add(item.alias);
          session.sessionBank.push(item);
        }
      }

      return { count: bankItems.length };
    },
    resultEvent: "ready",
    buildPayload: (r) => ({ count: r.count }),
  });
};
