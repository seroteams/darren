const fs = require("node:fs");
const path = require("node:path");

const { MEETING_TYPES } = require("../../../src/meeting-types");
const { CONFIG_DIR } = require("../../../backend/engine/paths");

const BENCH_PATH = path.join(CONFIG_DIR, "persona-bench-v1.json");

let cached = null;

function loadBench() {
  if (cached) return cached;
  const raw = fs.readFileSync(BENCH_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.personas)) {
    throw new Error("persona-bench-v1.json: personas array required");
  }
  cached = data.personas;
  return cached;
}

module.exports = function personaBench(c) {
  const personas = loadBench()
    .map((p) => {
      const meetingTypeIndex = MEETING_TYPES.findIndex((t) => t.label === p.meeting_type);
      return { ...p, meetingTypeIndex };
    })
    .sort((a, b) => a.order - b.order);

  c.json(200, { personas });
};
