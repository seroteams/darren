const { getArc } = require("./meeting-arcs");

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

function pickSeedOverflow(seeds, seenAliases) {
  const seen = seenAliases || new Set();
  const fresh = (seeds || []).filter((s) => !seen.has(s.alias) && !isForbiddenCloser(s));
  return fresh[0] || null;
}

module.exports = {
  FORBIDDEN_CLOSER_RE,
  isForbiddenCloser,
  selectReservedCloser,
  pickSeedOverflow,
};
