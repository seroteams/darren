// Run one scenario through the full pipeline via smoke-test.js and resolve the
// session directory it wrote. Extracted from sweep.js so the sweep and the
// trust gate (scripts/gate.js) share one implementation.

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { monthFolderFor } = require("../../src/session");

const ROOT = path.join(__dirname, "..", "..");

function scanSessions() {
  const out = [];
  const logsDir = path.join(ROOT, "logs");
  if (!fs.existsSync(logsDir)) return out;
  for (const month of fs.readdirSync(logsDir)) {
    const monthDir = path.join(logsDir, month);
    let entries = [];
    try {
      entries = fs.readdirSync(monthDir);
    } catch {
      entries = [];
    }
    for (const id of entries) out.push(path.join(month, id));
  }
  return out;
}

const SESSION_ID_RE = /session (\d{4}_[A-Z][a-z]{2}\d{2}_\d{2}-\d{2}-[a-f0-9]{8})/;

function resolveNewSession(stdout, before) {
  const idMatch = stdout.match(SESSION_ID_RE);
  if (idMatch) {
    const month = monthFolderFor(idMatch[1]);
    if (month) {
      const rel = path.join(month, idMatch[1]);
      if (fs.existsSync(path.join(ROOT, "logs", rel))) return rel;
    }
  }
  const newSessions = scanSessions().filter((d) => !before.has(d));
  const completed = newSessions
    .filter((rel) => fs.existsSync(path.join(ROOT, "logs", rel, "transcript.json")))
    .sort();
  if (completed.length) return completed[completed.length - 1];
  return newSessions.sort()[newSessions.length - 1] || null;
}

function runSmoke(scenarioPath) {
  return new Promise((resolve, reject) => {
    const before = new Set(scanSessions());
    const startedAt = Date.now();
    const child = spawn(process.execPath, ["smoke-test.js", scenarioPath], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      const sessionRel = resolveNewSession(stdout, before);
      resolve({
        code,
        stdout,
        duration_ms: Date.now() - startedAt,
        sessionDir: sessionRel ? path.join(ROOT, "logs", sessionRel) : null,
      });
    });
  });
}

module.exports = { runSmoke, scanSessions, resolveNewSession, ROOT };
