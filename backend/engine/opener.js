const fs = require("node:fs");
const path = require("node:path");
const { slugify } = require("./questions");
const { getArc } = require("./meeting-arcs");
const { checkQuestionEligibility, rejectionEntry } = require("./question-eligibility");
const { QUESTIONS_DIR } = require("./paths.mts");

const OPENERS_FILE = path.join(QUESTIONS_DIR, "_openers.json");

const HEAVY_NOTES_RE = /\boff\b|heavy|hard|struggl|burnt|tired|quiet|withdrawn|distant|stress|worried|concern/i;

function loadOpeners() {
  return JSON.parse(fs.readFileSync(OPENERS_FILE, "utf8"));
}

function pickOpener(ctx, { rejections } = {}) {
  const openers = loadOpeners();
  const meetingSlug = slugify(ctx.meetingType || "");
  const notesHeavy = HEAVY_NOTES_RE.test(ctx.notes || "");
  const arc = getArc(meetingSlug);
  const anchorStageId = arc.arc[0]?.id || null;
  const eligibleOpeners = openers.filter((o) => {
    const typeOk = o.meeting_types.includes(meetingSlug) || o.meeting_types.includes("all");
    if (!typeOk) return false;
    if (o.stage != null && o.stage !== anchorStageId) return false;
    // Type rules win over meeting_types tagging — an opener tagged for this
    // type but matching its forbidden patterns still can't be served.
    const check = checkQuestionEligibility(o, { meetingType: ctx.meetingType });
    if (!check.ok) {
      if (rejections) {
        rejections.push(
          rejectionEntry({
            question: o,
            check,
            source: "opener_pick",
            meetingType: ctx.meetingType,
            fallback: "next eligible opener",
          })
        );
      }
      return false;
    }
    return true;
  });

  if (!eligibleOpeners.length) {
    throw new Error(`no eligible opener for meeting type ${meetingSlug}`);
  }

  const scored = eligibleOpeners.map((o) => {
    let score = 0;

    if (o.meeting_types.includes(meetingSlug)) score += 2;
    else if (o.meeting_types.includes("all")) score += 1;

    if (o.stage === anchorStageId) score += 2;

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
    stage: pick.stage ?? anchorStageId,
    axis_effects: pick.axis_effects,
    source: pick.source,
  };
}

module.exports = { pickOpener };
