// Test: "Recap fixes" (user-test-fixes P2) — mounts the REAL recap stage
// (stages/briefing.js) with hardcoded data shaped like Machar's 2026-07-29 run,
// so the P2 fixes are walkable without a finished 1:1 (every live turn is a paid
// model call). Zero API/engine calls, nothing saved. Opened from the /test gallery.
//
// The fixture deliberately carries each fixed defect's trigger:
//   - a BLANK summary bullet (used to paint a lone dot),
//   - a promise with NO date (used to paint an empty accent pill),
//   - one unread axis (renders the "Not rated" thumb at centre),
// so this screen proves the fixes, not just the happy path.

import { mount as mountBriefing } from "../briefing.js";

const BRIEFING = {
  headline:
    "Darryl has the delivery outcomes in view, but team conflict is now blocking the beta test and live-date path.",
  summary_bullets: [
    "", // ← the empty engine bullet: must NOT render a floating dot
    'He named a concrete release bar, "beta test" first, then "agree a live app delivery date", so the delivery target is not the gap.',
    'The contradiction is operational: Darryl can state the release sequence clearly, but "we need to resolve the conflict and I am finding it difficult" now sits in the critical path.',
  ],
  understanding_paragraph:
    "Darryl is carrying a clear delivery picture and a team conflict at the same time; the conflict, not the plan, is what threatens the dates.",
  axes: [
    { id: "wellbeing", score: -4, read_status: "read", meaning: 'He described the period as "stressful" and the people issues as "hard to manage"; worth noting, watch over the next few weeks.' },
    { id: "engagement", score: 2, read_status: "read", meaning: "He stayed focused on concrete delivery outcomes and release conditions; worth noting, watch over the next few weeks." },
    { id: "clarity", score: 4, read_status: "read", meaning: "The quarter goals were clear, but team conflict is now obscuring what good execution looks like day to day." },
    { id: "growth", score: 0, read_status: "not_read" },
  ],
  brutal_truth_employee:
    'Darryl is not vague about the work. The hard signal is in "we need to resolve the conflict and I am finding it difficult": the delivery risk now sits in conflict handling, not in naming outcomes.',
  brutal_truth_manager:
    'You got the release bar clearly, but the moment to press was after "I am finding it difficult". Next time, ask for the exact conflict pattern, the missed handoff, and the escalation point instead of stopping at the blocker label.',
  next_actions: [],
  watch_for: [
    "Before next 1:1: check whether Darryl can name one resolved conflict and the delivery step it unblocked.",
    "Within two weeks: if the live-date discussion slips again, ask which team conflict or handoff caused it.",
  ],
};

const PROMISES = [
  { owner: "manager", action: "Set up a follow-up with Darryl to map the specific team conflicts, missed handoffs, and owners blocking beta test readiness.", when: "today" },
  { owner: "manager", action: "Go live still TBC, we have one concrete agreement.", when: "" }, // ← no date: no pill
];

export function mount(root) {
  const store = {
    briefing: BRIEFING,
    promises: PROMISES,
    promisesSaveFailed: false,
    ctx: { name: "Darryl" },
    user: { role: "manager" }, // a plain manager: no debrief chrome, real customer view
    notes: [],
    sessionDir: "",
    scripted: false,
    skipBriefingAnimation: true, // instant paint — this is a fixture, not a celebration
  };
  const noop = () => {};
  void mountBriefing(root, { store, setState: noop, resetSession: noop });
}
