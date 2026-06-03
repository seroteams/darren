const { requireSession, persistSession } = require("../sessions");

const VERDICTS = new Set(["keep", "fix", "block"]);
const ISSUE_TYPES = new Set([
  "too_generic",
  "wrong_level",
  "bad_tone",
  "over_inferred",
  "missed_focus",
  "weak_action",
]);

// Structured tester verdict — the ground truth the Suggest-fix step consumes.
module.exports = async function verdict(c) {
  const body = await c.readBody();
  const { sessionId, verdict, issue_type, note } = body;
  const session = requireSession(sessionId);

  if (!VERDICTS.has(verdict))
    return c.error(Object.assign(new Error("invalid verdict"), { status: 400 }));
  if (issue_type && !ISSUE_TYPES.has(issue_type))
    return c.error(Object.assign(new Error("invalid issue_type"), { status: 400 }));

  session.verdict = {
    verdict,
    issue_type: issue_type || null,
    note: typeof note === "string" ? note.trim() || null : null,
    at: Date.now(),
  };
  persistSession(session);
  c.json(200, { ok: true, verdict: session.verdict });
};
