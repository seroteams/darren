// Lexicon-review endpoints. v1 = stub. Real candidate mining lives elsewhere
// (planned follow-up); this returns an empty candidate list so the UI flow runs
// end-to-end and `decisions` is persisted as JSONL for later processing.

const fs = require("node:fs");
const path = require("node:path");
const { getSession } = require("../sessions");

function candidates(c) {
  const sessionId = c.query.s;
  if (!sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  c.json(200, { candidates: [] });
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
  if (records.length) {
    const out = path.join(session.dir, "lexicon-decisions.jsonl");
    const line = records.map((r) => JSON.stringify({ ts: Date.now(), ...r })).join("\n") + "\n";
    fs.appendFileSync(out, line, "utf8");
  }
  c.json(200, { ok: true, count: records.length });
}

module.exports = { candidates, decisions };
