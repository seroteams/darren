const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

function promptVersionFor(promptPath) {
  const full = path.isAbsolute(promptPath) ? promptPath : path.join(ROOT, promptPath);
  const text = fs.readFileSync(full, "utf8");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
}

function withPromptVersion(inputs, promptPath) {
  if (!promptPath) return inputs;
  return { ...inputs, prompt_version: promptVersionFor(promptPath) };
}

module.exports = { promptVersionFor, withPromptVersion };
