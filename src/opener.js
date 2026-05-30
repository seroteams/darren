const fs = require("node:fs");
const path = require("node:path");
const { slugify } = require("./questions");
const { getArc } = require("./meeting-arcs");

const OPENERS_FILE = path.join(__dirname, "../questions/_openers.json");
const AXES = ["wellbeing", "engagement", "clarity", "growth"];

const HEAVY_NOTES_RE = /\boff\b|heavy|hard|struggl|burnt|tired|quiet|withdrawn|distant|stress|worried|concern/i;

function loadOpeners() {
  return JSON.parse(fs.readFileSync(OPENERS_FILE, "utf8"));
}

function extractAxesFromIntent(intent = "") {
  const text = String(intent).toLowerCase();
  return AXES.filter((axis) => text.includes(axis));
}

function pickOpener(ctx) {
  const openers = loadOpeners();
  const meetingSlug = slugify(ctx.meetingType || "");
  const notesHeavy = HEAVY_NOTES_RE.test(ctx.notes || "");
  const arc = getArc(meetingSlug);
  const anchorStageId = arc.arc[0]?.id || null;
  const anchorIntentAxes = new Set(extractAxesFromIntent(arc.arc[0]?.intent || ""));
  const eligibleOpeners = openers.filter((o) => {
    const stageEligible = o.stage == null || o.stage === anchorStageId;
    const axisEligible = Object.keys(o.axis_effects || {}).some((axis) => anchorIntentAxes.has(axis));
    return stageEligible || axisEligible;
  });

  const scored = eligibleOpeners.map((o) => {
    let score = 0;

    if (o.meeting_types.includes(meetingSlug)) score += 2;
    else if (o.meeting_types.includes("all")) score += 1;

    if (notesHeavy && o.tone === "warm") score += 1;

    return { opener: o, score };
  });

  const max = Math.max(...scored.map((s) => s.score));
  const pool = scored.filter((s) => s.score === max);
  const pick = pool[Math.floor(Math.random() * pool.length)].opener;

  // Return shape compatible with existing question objects
  return {
    alias: pick.alias,
    label: pick.label,
    name: pick.name,
    description: pick.description,
    purpose: pick.purpose,
    axis_effects: pick.axis_effects,
    source: pick.source,
  };
}

module.exports = { pickOpener };
