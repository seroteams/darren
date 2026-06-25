// Locate session directories under logs/<month>/<id>/. Shared by smoke-test.js
// (which writes a session) and run-scenario.js (which spawns smoke-test and then
// has to find the session it wrote). `root` is the project root.

const fs = require("node:fs");
const path = require("node:path");

const { monthFolderFor } = require("../../backend/engine/session.ts");

function scanSessions(root) {
  const logsDir = path.join(root, "logs");
  if (!fs.existsSync(logsDir)) return [];
  const out = [];
  for (const month of fs.readdirSync(logsDir)) {
    let entries = [];
    try {
      entries = fs.readdirSync(path.join(logsDir, month));
    } catch {
      entries = [];
    }
    for (const id of entries) out.push(path.join(month, id));
  }
  return out;
}

const SESSION_ID_RE = /session (\d{4}_[A-Z][a-z]{2}\d{2}_\d{2}-\d{2}-[a-f0-9]{8})/;

// Given a smoke-test run's stdout and the set of sessions that existed before it
// ran, return the relative path (month/id) of the session it created, or null.
function resolveNewSession(stdout, before, root) {
  const idMatch = stdout.match(SESSION_ID_RE);
  if (idMatch) {
    const month = monthFolderFor(idMatch[1]);
    if (month) {
      const rel = path.join(month, idMatch[1]);
      if (fs.existsSync(path.join(root, "logs", rel))) return rel;
    }
  }
  const newSessions = scanSessions(root).filter((d) => !before.has(d));
  const completed = newSessions
    .filter((rel) => fs.existsSync(path.join(root, "logs", rel, "transcript.json")))
    .sort();
  if (completed.length) return completed[completed.length - 1];
  return newSessions.sort()[newSessions.length - 1] || null;
}

module.exports = { scanSessions, resolveNewSession, SESSION_ID_RE };
