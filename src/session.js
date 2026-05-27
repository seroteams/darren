const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { writePipelineLock } = require("./pipeline-lock");

const LOGS_ROOT = path.join(__dirname, "..", "logs");

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const LONG_MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

function sessionId(now = new Date()) {
  // e.g. 2026_May08_21-53-a3f7b2c1
  const year = now.getFullYear();
  const month = SHORT_MONTHS[now.getMonth()];
  const day = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  return `${year}_${month}${day}_${hh}-${mm}-${suffix}`;
}

// Given a session id like "2026_May08_21-53-a3f7b2c1", return "may". Returns
// null if the id doesn't carry a recognisable month token.
function monthFolderFor(id) {
  const m = /^\d{4}_([A-Z][a-z]{2})\d{2}_/.exec(id);
  if (!m) return null;
  const idx = SHORT_MONTHS.indexOf(m[1]);
  return idx >= 0 ? LONG_MONTHS[idx] : null;
}

function createSession() {
  const now = new Date();
  const id = sessionId(now);
  const month = LONG_MONTHS[now.getMonth()];
  const dir = path.join(LOGS_ROOT, month, id);
  fs.mkdirSync(dir, { recursive: true });
  writePipelineLock(dir);
  return { id, dir };
}

function logStage(session, stageName, { inputs, prompt, response }) {
  if (!session) return;
  const stageDir = path.join(session.dir, stageName);
  fs.mkdirSync(stageDir, { recursive: true });

  fs.writeFileSync(
    path.join(stageDir, "inputs.json"),
    JSON.stringify(inputs, null, 2)
  );
  fs.writeFileSync(path.join(stageDir, "prompt.md"), prompt);
  fs.writeFileSync(
    path.join(stageDir, "response.json"),
    typeof response === "string" ? response : JSON.stringify(response, null, 2)
  );
}

function logFeedback(session, entry) {
  if (!session) return;
  const filePath = path.join(session.dir, "feedback.json");
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {}
  existing.push({ timestamp: new Date().toISOString(), ...entry });
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
}

module.exports = { createSession, logStage, logFeedback, sessionId, monthFolderFor, LOGS_ROOT };
