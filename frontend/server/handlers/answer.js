const { requireSession } = require("../sessions");

const MAX_ANSWER_CHARS = 4000;

function isSkip(input) {
  const s = (input || "").trim().toLowerCase();
  return s === "" || s === "skip" || s === "pass" || s === "-";
}

module.exports = async function answer(c) {
  const body = await c.readBody();
  const { sessionId, answer, goDeeper } = body;
  const session = requireSession(sessionId);

  if (session.turn >= session.totalBudget || session.queueRef.length === 0)
    return c.error(Object.assign(new Error("no question pending"), { status: 409 }));

  const raw = typeof answer === "string" ? answer : "";
  const truncated = raw.length > MAX_ANSWER_CHARS;
  const text = raw.slice(0, MAX_ANSWER_CHARS);
  const skipped = isSkip(text);
  session.pendingAnswer = { raw: text, skipped, text: skipped ? "(skipped)" : text };
  if (goDeeper === true && !skipped) session.pendingDrillRequest = true;
  c.json(202, { turn: session.turn + 1, skipped, truncated, goDeeper: goDeeper === true && !skipped });
};
