// The regression board's AI reviewer ("the committee"): one strong model call per
// rerun that scores the run on the SAME eight dimensions Carl marks by hand, and
// says whether it got better, worse or stayed the same against the previous rerun
// of the same case.
//
// It is ADVISORY. The deterministic trust checks (evals/trust-checks.ts) remain
// the hard gate — a judge that can fail a run on vibes is how an eval suite rots.
// Nothing here can change a trust verdict.
//
// Why a new module rather than reusing scripts/eval-judge.js: that one reads its
// inputs from a run DIRECTORY, which does not exist on the live site (no logs/
// dir survives a deploy), and it is CJS script-land. This takes in-memory values
// and is injected at the boundary, so it works on both lanes and is testable
// without a model call. eval-judge.js stays untouched for the terminal gate; the
// calibration lines below are deliberately borrowed from it so the two judges
// score on the same curve.

import { callAI, parseAIJson } from "./ai-client.ts";
import { modelFor } from "./models.ts";
import { REVIEW_DIM_KEYS } from "./run-projections.ts";

/** The hint text each dimension is judged against — kept in step with the
 *  client's DIMENSIONS list in admin/src/ui/review-serialize.js. */
const DIMENSION_HINTS: Record<string, string> = {
  role_aware: "Specific to this person's role and seniority, not generic.",
  meeting_aware: "Shaped for this meeting type.",
  grounded: "Every claim traces to the manager's note.",
  evidence: "Conclusions cite what was actually said.",
  no_overreach: "No diagnosis beyond what the answers support.",
  trust: "The manager's private concern never surfaced in employee-facing output.",
  next_actions: "Concrete, manager-owned next steps.",
  briefing_usable: "A manager could walk in on it as-is.",
};

export type Delta = "improved" | "same" | "worse";

export interface JudgeDimension {
  key: string;
  verdict: "pass" | "fail";
  reason: string;
}

export interface JudgeHeadToHead {
  overall: Delta;
  dimensions: { key: string; delta: Delta }[];
  reason: string;
}

/** sharper-questions P1 — the grade on the QUESTIONS, kept separate from the eight
 *  recap dimensions on purpose. REVIEW_DIM_KEYS is the list Carl marks by hand in the
 *  run review tool and drives reviewStatusOf's "complete"; adding a ninth key there
 *  would change his UI and quietly downgrade every finished review to "partial".
 *  This rides alongside instead. */
export interface JudgeQuestionQuality {
  /** 1-5 on the questions as a set, judged as a conversation, not as a recap. */
  score: number;
  reason: string;
  /** Turn numbers that bought nothing and should not have been spent. */
  wasted_turns: number[];
  /** The moment the questions should have pressed and did not, or null if none. */
  missed_moment: string | null;
}

export interface JudgeResult {
  score: number;
  dimensions: JudgeDimension[];
  /** Null on a case's first-ever rerun: there is nothing to compare against. */
  head_to_head: JudgeHeadToHead | null;
  flags: string[];
  /** Null when the judge did not return one (older stored results stay readable). */
  question_quality: JudgeQuestionQuality | null;
}

/** One side of the comparison, in the shape the judge reads. */
export interface JudgeRunInput {
  transcript: { question: string; answer: string; skipped?: boolean }[];
  briefing: unknown;
  trust?: { verdict?: string; hard_fails?: string[] } | null;
}

export interface JudgeInput {
  scenario: {
    name: string;
    role: string;
    seniority: string;
    meetingType: string;
    managerNotes: string;
  };
  current: JudgeRunInput;
  /** The previous rerun of this case, or null when this is the first. */
  baseline: JudgeRunInput | null;
}

const DELTA = { type: "string", enum: ["improved", "same", "worse"] };

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 1, maximum: 5 },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: REVIEW_DIM_KEYS },
          verdict: { type: "string", enum: ["pass", "fail"] },
          reason: { type: "string" },
        },
        required: ["key", "verdict", "reason"],
        additionalProperties: false,
      },
    },
    head_to_head: {
      type: ["object", "null"],
      properties: {
        overall: DELTA,
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: { key: { type: "string", enum: REVIEW_DIM_KEYS }, delta: DELTA },
            required: ["key", "delta"],
            additionalProperties: false,
          },
        },
        reason: { type: "string" },
      },
      required: ["overall", "dimensions", "reason"],
      additionalProperties: false,
    },
    flags: { type: "array", items: { type: "string" } },
    question_quality: {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 1, maximum: 5 },
        reason: { type: "string" },
        wasted_turns: { type: "array", items: { type: "integer" } },
        missed_moment: { type: ["string", "null"] },
      },
      required: ["score", "reason", "wasted_turns", "missed_moment"],
      additionalProperties: false,
    },
  },
  required: ["score", "dimensions", "head_to_head", "flags", "question_quality"],
  additionalProperties: false,
};

export function buildSystemPrompt(hasBaseline: boolean): string {
  const lines = [
    "You are an experienced, fair QA judge for manager 1:1 preparation outputs.",
    "Judge the recap and the conversation that produced it, for this meeting type only.",
    "Be concise and evidence-based. Quote what was actually said rather than describing it.",
    "",
    "Mark each of these eight dimensions pass or fail, with a one-line reason:",
    ...REVIEW_DIM_KEYS.map((k) => `- ${k}: ${DIMENSION_HINTS[k] ?? ""}`),
    "",
    "Use the full 1-5 scale: 5 = excellent, fit-for-purpose; 4 = good, minor nits only; 3 = mixed, a real weakness; 2 = notably off-type or shallow; 1 = wrong type or broken.",
    "Minor nits must NOT by themselves drop the score, and do not penalise the absence of a deliverable this meeting type does not require.",
    "BUT trust and honesty failures are NOT nits — score them 2 or below: if the manager's PRIVATE notes or worries appear in employee-facing output, or the recap diagnoses the person confidently from thin or skipped answers, that is a substantive failure. Add a flag naming it.",
    "Never reward length. A shorter recap that a manager can act on beats a longer one that cannot.",
    "",
    "Then judge the QUESTIONS separately, as a conversation rather than as a document.",
    "The recap is written afterwards; the questions are all the manager actually had in the room.",
    "- Score 1-5 on whether these were the right things to ask this person, in this order.",
    "- List the turn numbers that bought nothing: a question that repeated an earlier one, that the answer had already covered, or that moved the conversation nowhere.",
    "- If an answer named something stalled, stuck or dropped, and the NEXT question changed the subject instead of asking what they would do about it, record that as the missed moment. Name the turn.",
    "- A recap that points out an opening the questions walked past is a failure of the questions, not a strength of the recap. Score it that way.",
    "- If nothing was missed, return missed_moment as null rather than inventing one.",
  ];
  if (hasBaseline) {
    lines.push(
      "",
      "You are also given the PREVIOUS run of this same scenario, with the same manager setup and the same answers. Compare them:",
      "- For each dimension, say whether the new run is improved, same or worse than the previous one.",
      "- Give one overall delta and a single-sentence reason naming the concrete difference.",
      "- Judge the change, not the absolute quality: two mediocre runs that are equally mediocre are 'same'.",
      "- Wording that differs but means the same thing is 'same'.",
    );
  } else {
    lines.push("", "There is no previous run to compare against. Return head_to_head as null.");
  }
  return lines.join("\n");
}

function compactRun(run: JudgeRunInput): Record<string, unknown> {
  return {
    transcript: run.transcript.map((t, i) => ({
      turn: i + 1,
      question: t.question,
      answer: t.skipped ? "(skipped)" : t.answer,
    })),
    recap: run.briefing,
    safety_checks: run.trust ? { verdict: run.trust.verdict, failures: run.trust.hard_fails || [] } : null,
  };
}

export function buildUserPayload(input: JudgeInput): Record<string, unknown> {
  return {
    scenario: {
      name: input.scenario.name,
      role: input.scenario.role,
      seniority: input.scenario.seniority,
      meeting_type: input.scenario.meetingType,
      // The private note is given so the judge can check it did NOT leak. It is
      // manager-private by definition and must never appear in its reasons.
      manager_private_note: input.scenario.managerNotes,
    },
    new_run: compactRun(input.current),
    previous_run: input.baseline ? compactRun(input.baseline) : null,
  };
}

/** The model boundary, injected so tests never make a call. */
export type CallAI = typeof callAI;

export async function judgeRerun(input: JudgeInput, deps: { callAI?: CallAI; model?: string } = {}): Promise<JudgeResult> {
  const call = deps.callAI ?? callAI;
  // The strong tier (config/models.json "judge"), never a nano model: a weak
  // judge produces harsh, low-signal verdicts. Same reasoning as eval-judge.js.
  const model = deps.model ?? modelFor("judge");

  const raw = await call({
    system: buildSystemPrompt(Boolean(input.baseline)),
    user: [
      "Judge this 1:1 preparation run.",
      "Return JSON only.",
      JSON.stringify(buildUserPayload(input), null, 2),
    ].join("\n\n"),
    schema: RESPONSE_SCHEMA,
    schemaName: "regression_judge_result",
    temperature: 0.1,
    model,
    costLabel: "regression-judge",
  });

  const result = parseAIJson(raw, "Regression judge", ["score", "dimensions", "head_to_head", "flags"]) as Record<
    string,
    unknown
  >;

  const dimensions = Array.isArray(result.dimensions)
    ? (result.dimensions as JudgeDimension[]).filter((d) => REVIEW_DIM_KEYS.includes(d?.key))
    : [];

  // A judge that invents a comparison when there was nothing to compare is worse
  // than one that admits it — force the null through regardless of what came back.
  const head_to_head = input.baseline && result.head_to_head ? (result.head_to_head as JudgeHeadToHead) : null;

  // Absent on results stored before this field existed, so it stays optional rather
  // than defaulting to a score the judge never gave.
  const q = result.question_quality as Record<string, unknown> | undefined | null;
  const question_quality: JudgeQuestionQuality | null =
    q && typeof q === "object"
      ? {
          score: typeof q.score === "number" ? q.score : 0,
          reason: typeof q.reason === "string" ? q.reason : "",
          wasted_turns: Array.isArray(q.wasted_turns)
            ? (q.wasted_turns as unknown[]).filter((n): n is number => typeof n === "number")
            : [],
          missed_moment: typeof q.missed_moment === "string" ? q.missed_moment : null,
        }
      : null;

  return {
    score: typeof result.score === "number" ? result.score : 0,
    dimensions,
    head_to_head,
    flags: Array.isArray(result.flags) ? (result.flags as string[]) : [],
    question_quality,
  };
}
