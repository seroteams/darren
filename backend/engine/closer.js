const { getArc } = require("./meeting-arcs.ts");
const { checkQuestionEligibility, rejectionEntry } = require("./question-eligibility.ts");

const FORBIDDEN_CLOSER_RE =
  /cut your work in half|drop first[\s\S]{0,48}non-negotiable|priority ranking/i;

function isForbiddenCloser(question) {
  if (!question) return false;
  const text = `${question.name || ""} ${question.label || ""} ${question.description || ""}`;
  return FORBIDDEN_CLOSER_RE.test(text);
}

function selectReservedCloser(bankItems, meetingTypeLabel) {
  const arc = getArc(meetingTypeLabel);
  const finalStageId = arc.arc[arc.arc.length - 1].id;
  const candidates = (bankItems || []).filter(
    (q) => q.stage === finalStageId && !isForbiddenCloser(q)
  );
  if (!candidates.length) return null;
  return candidates[candidates.length - 1];
}

function pickSeedOverflow(seeds, seenAliases, { meetingType, askedNames = [], rejections } = {}) {
  const seen = seenAliases || new Set();
  for (const s of seeds || []) {
    if (!s || seen.has(s.alias) || isForbiddenCloser(s)) continue;
    // Seeds are global stock — they must still pass the active type's rules
    // and not repeat anything already asked (the Jun 11 run's overflow seed
    // was both forbidden for bi-weekly and a near-copy of the prior question).
    const check = checkQuestionEligibility(s, { meetingType, askedNames });
    if (!check.ok) {
      if (rejections) {
        rejections.push(
          rejectionEntry({
            question: s,
            check,
            source: "seed_overflow",
            meetingType,
            fallback: "next seed",
          })
        );
      }
      continue;
    }
    return s;
  }
  return null;
}

module.exports = {
  FORBIDDEN_CLOSER_RE,
  isForbiddenCloser,
  selectReservedCloser,
  pickSeedOverflow,
};
