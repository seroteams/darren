// PHASE-1 MOCK CONTENT — the trackers (promises · requests · goals) shown in the runner are
// hardcoded placeholders this phase, so the manager can walk the real screens before the data
// layer exists. Real persistent trackers replace all of this in Phase 2 (requests/goals) and
// Phase 3 (ratings); the promise carry-over in Catch-up arrives in Phase 2 too. Person-neutral
// on purpose — nothing here is tied to the real roster person yet.

export interface MockPromise {
  owner: "you" | "them";
  action: string;
}
export const MOCK_PROMISES: MockPromise[] = [
  { owner: "you", action: "Book the onboarding buddy" },
  { owner: "them", action: "Track where the week's hours actually go" },
];

export interface Outcome {
  value: string;
  label: string;
}
export const OUTCOMES: Outcome[] = [
  { value: "yes", label: "Done" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "Not yet" },
  { value: "changed", label: "Changed" },
];

export interface MockRequest {
  text: string;
  cat: string;
  status: string;
  raised: string;
  note: string;
}
export const MOCK_REQUESTS: MockRequest[] = [
  {
    text: "Wants to shadow a senior on the checkout redesign",
    cat: "Growth & development",
    status: "New",
    raised: "raised this month",
    note: "Keen to see how a senior scopes a big flow before leading one themselves.",
  },
  {
    text: "Clearer priorities at the start of each sprint",
    cat: "Concerns & feedback",
    status: "In progress",
    raised: "raised 2 months ago",
    note: "Comes up repeatedly — loses the first day of each sprint working out what matters.",
  },
];

export interface MockGoal {
  text: string;
  pct: number;
  status: string;
  history: string[];
}
export const MOCK_GOALS: MockGoal[] = [
  {
    text: "Own a feature end-to-end by Q3",
    pct: 77,
    status: "In progress",
    history: ["Jun — leading the empty-states work", "May — shadowing on the settings flow"],
  },
  {
    text: "Get confident giving design crit",
    pct: 24,
    status: "In progress",
    history: ["Jun — spoke up in two reviews"],
  },
  { text: "Run 3 peer feedback cycles", pct: 100, status: "Done", history: ["Jun — third cycle wrapped"] },
];
