// Prompt <-> gate coupling registry (agent-native P5).
//
// Some prompt rules are mirrored by hardcoded gate constants/regexes in
// backend/engine/golden-checks.ts and evals/trust-checks.ts. The coupling is
// real but invisible: edit one side and the other silently drifts, and only a
// PAID gate run used to catch it. Each row here names a prompt-encoded rule,
// the literal prompt text that carries it, and the gate identifier that
// enforces it. scripts/test-rule-registry.js verifies every row offline in
// `npm test` and goes red naming the broken link.
//
// EDITING A PROMPT RULE? Find its row, change prompt + gate together, then
// update the row's anchor. Adding a new prompt rule with a gate? Add a row.
// provenBy: golden case ids in evals/golden/_index.json; "*" = every golden
// case exercises this check (the gate suite runs all checks on all cases).

interface RuleCoupling {
  /** short human name for the rule */
  rule: string;
  /** file under content/prompts/ that carries the rule */
  promptFile: string;
  /** literal text that must stay present in the prompt (the rule's anchor) */
  promptAnchor: string;
  /** repo-relative file that enforces it */
  gateFile: string;
  /** the constant / function / hard-fail key that does the enforcing */
  gateIdentifier: string;
  /** golden cases that prove it ("*" = all) */
  provenBy: string[];
}

const RULE_REGISTRY: readonly RuleCoupling[] = [
  {
    rule: "focus reason opener (Whether/How they're/What/If)",
    promptFile: "generate-focus-points.md",
    promptAnchor: "the `reason` MUST start with one of: `Whether `, `How they're `, `What `, `If `",
    gateFile: "backend/engine/golden-checks.ts",
    gateIdentifier: "FOCUS_REASON_OPENER",
    provenBy: ["*"],
  },
  {
    rule: "focus reason: no consultant-deck phrasings",
    promptFile: "generate-focus-points.md",
    promptAnchor: "No noun-phrase-as-sentence starters",
    gateFile: "backend/engine/golden-checks.ts",
    gateIdentifier: "FOCUS_BANNED_REASON_PATTERNS",
    provenBy: ["*"],
  },
  {
    rule: "focus label: third-person topic phrase, not a second-person question",
    promptFile: "generate-focus-points.md",
    promptAnchor: "drop the `?` and end with `.`",
    gateFile: "backend/engine/golden-checks.ts",
    gateIdentifier: "FOCUS_LABEL_SECOND_PERSON",
    provenBy: ["*"],
  },
  {
    rule: "question text: business/military jargon banned",
    promptFile: "generate-questions.md",
    promptAnchor: '"air cover", "leverage", "circle back", "synergy"',
    gateFile: "backend/engine/golden-checks.ts",
    gateIdentifier: "JARGON_PATTERNS",
    provenBy: ["*"],
  },
  {
    rule: "relational arcs (bi-weekly / feels-off): no competency questions",
    promptFile: "generate-questions.md",
    promptAnchor: "no question may carry `purpose: competency`",
    gateFile: "backend/engine/golden-checks.ts",
    gateIdentifier: "runQuestionArcGate",
    provenBy: ["*"],
  },
  {
    rule: "briefing: never mention Sero / the planner / testers / QA internals",
    promptFile: "final-evaluation.md",
    promptAnchor: "Never mention Sero, the planner, testers, product QA, or system diagnostics",
    gateFile: "backend/engine/golden-checks.ts",
    gateIdentifier: "MANAGER_BRIEFING_BANS",
    provenBy: ["*"],
  },
  {
    rule: "briefing: no inferred internal states (no-inference ruling)",
    promptFile: "final-evaluation.md",
    promptAnchor: "NO_INFERRED_STATES",
    gateFile: "evals/trust-checks.ts",
    gateIdentifier: "INFERRED_STATE_LEAK",
    provenBy: ["thin-sam", "*"],
  },
];

export { RULE_REGISTRY };
export type { RuleCoupling };
