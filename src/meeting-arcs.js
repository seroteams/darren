const MEETING_ARCS = {
  "Bi-weekly check-in": {
    slug: "bi_weekly_check_in",
    tone_register:
      "Casual, fluent, peer-tempered. The manager is checking in, not auditing. Short questions, plain words. Willing to go deeper if something opens, but no agenda performance.",
    arc: [
      {
        id: "pulse",
        label: "Pulse",
        intent: "How is the last stretch sitting — fast read.",
        target_questions: 1,
      },
      {
        id: "friction",
        label: "Friction",
        intent: "Where is anything snagging — work, energy, people.",
        target_questions: 2,
      },
      {
        id: "momentum",
        label: "Momentum",
        intent: "What's moving forward and what's stuck.",
        target_questions: 2,
      },
      {
        id: "lift",
        label: "Lift",
        intent: "Closer. What would make the next two weeks lighter or sharper.",
        target_questions: 1,
      },
    ],
    anti_patterns: [
      "Agenda-heavy openers that read like a HR form.",
      "Pivoting to growth/career framing in a routine check-in.",
      "Generic 'how do you feel about X' instead of locating the friction.",
    ],
  },

  "Performance & feedback": {
    slug: "performance_feedback",
    tone_register:
      "Direct, adult-to-adult. No softening-as-cushioning. The manager has a view; the employee has a view; the meeting reconciles them. Name things plainly without dressing them up.",
    arc: [
      {
        id: "self_read",
        label: "Self-read",
        intent: "Their read of the last stretch before any manager view lands.",
        target_questions: 1,
      },
      {
        id: "evidence",
        label: "Evidence",
        intent: "Anchor on observable moments, not impressions.",
        target_questions: 2,
      },
      {
        id: "gap_naming",
        label: "Gap naming",
        intent: "Name the specific gap or pattern at issue.",
        target_questions: 2,
      },
      {
        id: "cause",
        label: "Cause",
        intent: "What's driving it from their side — capability, clarity, context, or capacity.",
        target_questions: 2,
      },
      {
        id: "commit",
        label: "Commit",
        intent: "Closer. A concrete behavioural change with a date.",
        target_questions: 1,
      },
    ],
    anti_patterns: [
      "Softening the gap so much it disappears.",
      "Leading the employee toward the manager's prewritten conclusion.",
      "Closing on 'how do you feel about that' instead of a concrete commitment.",
    ],
  },

  "Growth & career plan": {
    slug: "growth_career_plan",
    tone_register:
      "Aspirational, forward-leaning, generative. Future-tense. The employee is the protagonist of their own next chapter; the manager is a coach, not an HR checkbox. Make 'imagine', 'what would', 'where do you want' do the heavy lifting.",
    arc: [
      {
        id: "anchor",
        label: "Anchor",
        intent: "Where they are now in role — what's solid, what's stretching.",
        target_questions: 2,
      },
      {
        id: "aspiration",
        label: "Aspiration",
        intent: "Where they want to go, concretely — named roles, named scopes, named outcomes.",
        target_questions: 2,
      },
      {
        id: "gap",
        label: "Gap",
        intent: "What's between here and there — skills, exposure, decisions, time.",
        target_questions: 2,
      },
      {
        id: "investment",
        label: "Investment",
        intent: "What has to change from them, from you as manager, from the org — and what gets traded off.",
        target_questions: 2,
      },
      {
        id: "commitment",
        label: "Commitment",
        intent: "Closer. One concrete next move before the next conversation.",
        target_questions: 1,
      },
    ],
    anti_patterns: [
      "Round-robin axis coverage that never deepens a single thread.",
      "Asking 'what skill do you want to develop' before knowing where they want to go.",
      "Closing on 'what support do you need from me' without first earning the gap and the investment.",
      "Reframing growth questions as role-clarity or feedback questions — that's a different meeting type.",
    ],
  },

  "Something feels off": {
    slug: "something_feels_off",
    tone_register:
      "Observation-first, opt-in, low-pressure. The manager names what they saw; the employee chooses whether and how to engage. No diagnosis, no leading, no probing for an emotion the employee hasn't named.",
    arc: [
      {
        id: "landing",
        label: "Landing",
        intent: "Surface a no-pressure space to arrive.",
        target_questions: 1,
      },
      {
        id: "observation",
        label: "Observation",
        intent: "Name the observable shift, hand them the mic.",
        target_questions: 2,
      },
      {
        id: "underneath",
        label: "Underneath",
        intent: "If they open the door, follow it — what's underneath.",
        target_questions: 2,
      },
      {
        id: "support",
        label: "Support",
        intent: "Closer. What would help, if anything, right now.",
        target_questions: 1,
      },
    ],
    anti_patterns: [
      "Naming an emotion or diagnosis the employee hasn't named themselves.",
      "Stacking 'what's wrong' probes without giving them an opt-out.",
      "Treating the meeting like a performance review.",
    ],
  },
};

const BY_SLUG = Object.fromEntries(Object.values(MEETING_ARCS).map((arc) => [arc.slug, arc]));

function getArc(meetingType) {
  if (!meetingType) {
    throw new Error("getArc: meetingType is required");
  }
  if (MEETING_ARCS[meetingType]) return MEETING_ARCS[meetingType];
  if (BY_SLUG[meetingType]) return BY_SLUG[meetingType];
  const known = Object.keys(MEETING_ARCS).join(", ");
  throw new Error(`getArc: unknown meeting type "${meetingType}". Known: ${known}`);
}

function listStageIds(meetingType) {
  return getArc(meetingType).arc.map((s) => s.id);
}

module.exports = { MEETING_ARCS, getArc, listStageIds };
