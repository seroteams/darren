const { requireSession } = require("../sessions");
const { suggestAnswers } = require("../../engine/answer-suggester.ts");

// Dev-only roleplay aid: draft a few in-character employee answers for the
// question currently on screen. Failures degrade to an empty list — the UI
// just shows nothing rather than blocking the run.
module.exports = async function suggestAnswersHandler(c) {
  const session = requireSession(c.query.s);
  const q = session.queueRef[0];
  if (!q) return c.json(200, { answers: [] });

  try {
    const answers = await suggestAnswers({
      ...session.ctx,
      question: q.name,
      questionLabel: q.label || "",
      questionDescription: q.description || "",
      transcript: session.transcript,
    });
    c.json(200, { answers });
  } catch (e) {
    console.warn("[suggest-answers] failed:", e.message);
    c.json(200, { answers: [] });
  }
};
