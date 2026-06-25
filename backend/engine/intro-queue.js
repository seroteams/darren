const path = require("node:path");
const questions = require("./questions.ts");
const { getArc } = require("./meeting-arcs");

function sortIntroByArc(introItems, meetingTypeLabel) {
  const arc = getArc(meetingTypeLabel);
  const stageOrder = new Map(arc.arc.map((stage, index) => [stage.id, index]));
  return [...introItems].sort((a, b) => {
    const ai = stageOrder.has(a.stage) ? stageOrder.get(a.stage) : 999;
    const bi = stageOrder.has(b.stage) ? stageOrder.get(b.stage) : 999;
    if (ai !== bi) return ai - bi;
    return String(a.alias || "").localeCompare(String(b.alias || ""));
  });
}

function loadIntroQueue(meetingTypeLabel, budget) {
  const slug = questions.slugify(meetingTypeLabel);
  const loaded = questions.loadDir(path.join("_intro", slug));
  const sorted = sortIntroByArc(loaded, meetingTypeLabel);
  return sorted.slice(0, budget);
}

module.exports = { loadIntroQueue, sortIntroByArc };
