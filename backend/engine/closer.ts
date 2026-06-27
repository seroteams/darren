import { getArc } from "./meeting-arcs.ts";
import { checkQuestionEligibility, rejectionEntry } from "./question-eligibility.ts";

const FORBIDDEN_CLOSER_RE =
  /cut your work in half|drop first[\s\S]{0,48}non-negotiable|priority ranking/i;

interface CloserQuestion {
  alias?: string;
  name?: string;
  label?: string;
  description?: string;
  stage?: string | null;
}

function isForbiddenCloser(question: CloserQuestion | null | undefined): boolean {
  if (!question) return false;
  const text = `${question.name || ""} ${question.label || ""} ${question.description || ""}`;
  return FORBIDDEN_CLOSER_RE.test(text);
}

function selectReservedCloser<T extends CloserQuestion>(
  bankItems: T[] | null | undefined,
  meetingTypeLabel: string,
): T | null {
  const arc = getArc(meetingTypeLabel);
  const finalStageId = arc.arc[arc.arc.length - 1]?.id;
  const candidates = (bankItems || []).filter(
    (q) => q.stage === finalStageId && !isForbiddenCloser(q)
  );
  if (!candidates.length) return null;
  return candidates[candidates.length - 1] ?? null;
}

function pickSeedOverflow<T extends CloserQuestion>(
  seeds: Array<T | null | undefined> | null | undefined,
  seenAliases: Set<string> | null | undefined,
  {
    meetingType,
    askedNames = [],
    rejections,
  }: {
    meetingType?: string;
    askedNames?: string[];
    rejections?: ReturnType<typeof rejectionEntry>[];
  } = {},
): T | null {
  const seen = seenAliases || new Set<string>();
  for (const s of seeds || []) {
    if (!s || (s.alias != null && seen.has(s.alias)) || isForbiddenCloser(s)) continue;
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

export {
  FORBIDDEN_CLOSER_RE,
  isForbiddenCloser,
  selectReservedCloser,
  pickSeedOverflow,
};
