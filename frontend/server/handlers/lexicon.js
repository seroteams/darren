// Lexicon-review endpoints. GET /candidates triggers the AI reviewer (or
// returns the cached trace), maps suggestions to a UI-friendly shape. POST
// /decisions writes user's keeps into the candidate yaml via the same code
// path the CLI uses.

const fs = require("node:fs");
const path = require("node:path");
const { getSession } = require("../sessions");
const {
  generateSuggestions,
  commitDecisions,
  suggestionId,
  shouldReview,
} = require("../../../src/lexicon-reviewer");

function describePhrase(s) {
  if (s.type === "prefer_term") return s.value;
  if (s.type === "prefer_phrase") return s.value;
  if (s.type === "avoid_phrase") {
    return s.better_as ? `Avoid: "${s.value}" → try: "${s.better_as}"` : `Avoid: "${s.value}"`;
  }
  return s.value;
}

function mapForUi(suggestions) {
  return suggestions.map((s, i) => ({
    id: suggestionId(s, i),
    type: s.type,
    phrase: describePhrase(s),
    context: s.reason || s.evidence || "",
  }));
}

async function candidates(c) {
  const sessionId = c.query.s;
  if (!sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  if (!shouldReview(session.ctx)) {
    return c.json(200, { candidates: [], skipped: "out-of-scope" });
  }

  try {
    const result = await generateSuggestions({ session, ctx: session.ctx });
    if (result.skipped) {
      return c.json(200, { candidates: [], skipped: result.reason || "skipped" });
    }
    return c.json(200, { candidates: mapForUi(result.suggestions || []) });
  } catch (e) {
    return c.error(Object.assign(new Error(e.message || "lexicon review failed"), { status: 500 }));
  }
}

async function scope(c) {
  const sessionId = c.query.s;
  if (!sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  return c.json(200, { eligible: shouldReview(session.ctx) });
}

async function decisions(c) {
  const body = await c.readBody();
  const { sessionId, decisions: list } = body || {};
  if (!sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  const records = Array.isArray(list) ? list : [];

  // Audit trail in session dir — full keep/drop log, regardless of scope.
  if (records.length) {
    const out = path.join(session.dir, "lexicon-decisions.jsonl");
    const line = records.map((r) => JSON.stringify({ ts: Date.now(), ...r })).join("\n") + "\n";
    fs.appendFileSync(out, line, "utf8");
  }

  // Roll keeps into candidate yaml when scope is reviewable.
  const keepIds = records.filter((r) => r && r.keep).map((r) => r.id);
  let commit = { skipped: true, reason: "out-of-scope" };
  if (shouldReview(session.ctx)) {
    commit = commitDecisions({ session, ctx: session.ctx, keepIds });
  }

  c.json(200, { ok: true, count: records.length, committed: commit.accepted?.length || 0 });
}

module.exports = { candidates, scope, decisions };
