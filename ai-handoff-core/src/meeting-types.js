const MEETING_TYPES = [
  {
    label: "Bi-weekly check-in",
    badge: "Recommended",
    duration: "15 to 20 min",
    description: "Steady catch-ups on workload, motivation, and how things are really going.",
  },
  {
    label: "Performance & feedback",
    badge: null,
    duration: "20 to 30 min",
    description: "When you need to name a gap or missed expectation clearly and constructively.",
  },
  {
    label: "Growth & career plan",
    badge: "New",
    duration: "30 to 45 min",
    description: "When someone wants to grow, step up, or plan what comes next.",
  },
  {
    label: "Something feels off",
    badge: null,
    duration: "20 to 30 min",
    description:
      "When energy, behaviour, confidence, or communication has shifted and you want to understand before assuming.",
  },
  {
    label: "Onboarding check-in",
    badge: null,
    duration: "15 to 20 min",
    description:
      "First few weeks of a new joiner — how they're settling, what's still unclear, and where they need unblocking.",
  },
];

module.exports = { MEETING_TYPES };
