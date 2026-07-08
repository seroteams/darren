// Run one scenario through the full pipeline via smoke-test.js and resolve the
// session directory it wrote. Extracted from sweep.js so the sweep and the
// trust gate (scripts/gate.js) share one implementation.

const path = require("node:path");
const { spawn } = require("node:child_process");

const { scanSessions, resolveNewSession } = require("./session-fs");

const ROOT = path.join(__dirname, "..", "..");

function runSmoke(scenarioPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const before = new Set(scanSessions(ROOT));
    const startedAt = Date.now();
    const child = spawn(process.execPath, ["scripts/smoke-test.js", scenarioPath], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", ...(opts.env || {}) },
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
      const sessionRel = resolveNewSession(stdout, before, ROOT);
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

