const fs = require("node:fs");
const path = require("node:path");
const { slugify } = require("./questions");

const OPENERS_FILE = path.join(__dirname, "../questions/_openers.json");

const HEAVY_NOTES_RE = /\boff\b|heavy|hard|struggl|burnt|tired|quiet|withdrawn|distant|stress|worried|concern/i;

function loadOpeners() {
  return JSON.parse(fs.readFileSync(OPENERS_FILE, "utf8"));
}

function pickOpener(ctx) {
  const openers = loadOpeners();
  const meetingSlug = slugify(ctx.meetingType || "");
  const notesHeavy = HEAVY_NOTES_RE.test(ctx.notes || "");

  const scored = openers.map((o) => {
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
