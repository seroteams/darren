const fs = require("node:fs");
const path = require("node:path");
const { requireSession } = require("../sessions");

const MAX_ANSWER_CHARS = 4000;

function isSkip(input) {
  const s = (input || "").trim().toLowerCase();
  return s === "" || s === "skip" || s === "pass" || s === "-";
}

// Scripted test lane only: track which questions got a locked answer vs the
// per-persona fallback, so Compare can flag runs that drifted off-script.
function recordCoverage(session, alias, answerSource) {
  if (session.mode !== "scripted") return;
  const cov = session.scriptCoverage || {
    aliases_answered_by_script: [],
    aliases_missing_script: [],
    fallback_count: 0,
  };
  if (answerSource === "scripted") {
    if (alias && !cov.aliases_answered_by_script.includes(alias)) cov.aliases_answered_by_script.push(alias);
  } else if (answerSource === "fallback") {
    cov.fallback_count += 1;
    if (alias && !cov.aliases_missing_script.includes(alias)) cov.aliases_missing_script.push(alias);
  }
  session.scriptCoverage = cov;
  try {
    fs.writeFileSync(path.join(session.dir, "script-coverage.json"), JSON.stringify(cov, null, 2));
  } catch (e) {
    console.warn("[answer] coverage write failed:", e.message);
  }
}

module.exports = async function answer(c) {
  const body = await c.readBody();
  const { sessionId, answer, goDeeper, answerSource, alias } = body;
  const session = requireSession(sessionId);

  if (session.turn >= session.totalBudget || session.queueRef.length === 0)
    return c.error(Object.assign(new Error("no question pending"), { status: 409 }));

  const raw = typeof answer === "string" ? answer : "";
  const truncated = raw.length > MAX_ANSWER_CHARS;
  const text = raw.slice(0, MAX_ANSWER_CHARS);
  const skipped = isSkip(text);
  session.pendingAnswer = { raw: text, skipped, text: skipped ? "(skipped)" : text };
  if (goDeeper === true && !skipped) session.pendingDrillRequest = true;
  recordCoverage(session, alias, answerSource);
  c.json(202, { turn: session.turn + 1, skipped, truncated, goDeeper: goDeeper === true && !skipped });
};
