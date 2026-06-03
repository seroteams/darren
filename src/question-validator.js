// Reject broken or note-mirrored question stems before they reach the manager UI.

const FALLBACK_STEM =
  "What would have helped catch that before handoff?";

const VAGUE_MORE = /can you say more about what that means/i;
const SUBJECT_VERB =
  /\b(you|she|he|they|what|when|where|how|can|could|would|did|is|are|will|who)\s+\w/i;

const NOTE_TELEGRAPH =
  /^(thought|missed|main paths|she felt|escalates when)\b/i;

function tokenSet(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function overlapRatio(a, b) {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared += 1;
  return shared / Math.min(ta.size, tb.size);
}

function answerIsSubstantive(answer) {
  const a = String(answer || "").trim();
  if (a.length < 20) return false;
  const lower = a.toLowerCase();
  if (NOTE_TELEGRAPH.test(lower)) return true;
  if (/\b(missed|assumption|escalat|handoff|edge case|retry)\b/i.test(lower)) return true;
  return a.split(/\s+/).length >= 8;
}

function startsWithBrokenFragment(name) {
  const s = String(name || "").trim();
  if (/^hought\b/i.test(s)) return true;
  if (/^[a-z]{4,12}\s+retry\b/i.test(s) && !/^when\b/i.test(s)) return true;
  if (/^thought retry logic\b/i.test(s) && !/^when you assumed/i.test(s)) return true;
  return false;
}

function validateQuestionBeforeShow({ name, answer, transcript } = {}) {
  const stem = String(name || "").trim();
  if (!stem) {
    return { ok: false, reason: "empty stem", fallback: FALLBACK_STEM };
  }
  if (startsWithBrokenFragment(stem)) {
    return { ok: false, reason: "broken fragment opener", fallback: FALLBACK_STEM };
  }
  if (/^thought retry logic\b/i.test(stem) && !/^when you assumed/i.test(stem)) {
    return { ok: false, reason: "note shorthand as stem", fallback: FALLBACK_STEM };
  }
  if (answer && overlapRatio(stem, answer) >= 0.55 && !SUBJECT_VERB.test(stem)) {
    return { ok: false, reason: "copied answer telegraphy", fallback: FALLBACK_STEM };
  }
  if (!SUBJECT_VERB.test(stem)) {
    return { ok: false, reason: "missing clear subject/verb", fallback: FALLBACK_STEM };
  }
  if (VAGUE_MORE.test(stem) && answerIsSubstantive(answer)) {
    return { ok: false, reason: "vague follow-up on substantive answer", fallback: FALLBACK_STEM };
  }
  return { ok: true };
}

module.exports = {
  validateQuestionBeforeShow,
  FALLBACK_STEM,
  startsWithBrokenFragment,
};
