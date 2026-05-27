const fs = require("node:fs");
const path = require("node:path");

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function sessionFile(session, name) {
  return path.join(session.dir, name);
}

function isSkip(input) {
  const s = (input || "").trim().toLowerCase();
  return s === "" || s === "skip" || s === "pass" || s === "-";
}

module.exports = { writeJson, sessionFile, isSkip };
