// The canonical pipeline order, declared once (agent-native P4).
//
// The pipeline is orchestrated in TWO places - web (session-streams.ts, SSE
// handlers, client-driven order) and CLI (backend/cli.ts -> cli/stages/*). This
// constant is the single declarative map of what the sequence IS; the offline
// parity test (backend/tests/pipeline/test-stage-parity.js) fails the moment
// either path drops, renames, or (CLI) reorders a stage against it.
//
// If you change the pipeline: update BOTH orchestrators AND this list - the
// test names exactly what drifted. Full map: docs/reference/engine-map.md.

interface PipelineStage {
  /** run-log folder + cassette label prefix, e.g. "01-focus-points" */
  id: string;
  /** key in content/config/models.json / models.ts STAGES */
  modelStage: string;
  /** costLabel passed to callAI by this stage (cassette replay matches on it) */
  costLabel: string;
  /** the engine entry function (exported from index.ts) */
  engineFn: string;
  /** file under backend/engine/ that owns the stage */
  engineFile: string;
  /** the CLI stage driver (backend/engine/cli/stages/*) */
  cliFn: string;
  /** stage runs once per turn rather than once per session */
  repeats?: boolean;
}

const STAGE_SEQUENCE: readonly PipelineStage[] = [
  { id: "01-focus-points", modelStage: "focus_points", costLabel: "01-focus-points", engineFn: "generateFocusPoints", engineFile: "generate.ts", cliFn: "runFocusPointsStage" },
  { id: "01b-preparation", modelStage: "preparation", costLabel: "01b-preparation", engineFn: "generatePreparation", engineFile: "preparation.ts", cliFn: "runPreparationStage" },
  { id: "03-question-bank", modelStage: "bank", costLabel: "03-question-bank", engineFn: "generateBankWithFallback", engineFile: "question-generator.ts", cliFn: "runQuestionBankStage" },
  { id: "04-plan-turn", modelStage: "planner", costLabel: "04-plan-turn", engineFn: "planTurn", engineFile: "queue-manager.ts", cliFn: "runQuestioningLoop", repeats: true },
  { id: "05-evaluation", modelStage: "evaluation", costLabel: "05-evaluation", engineFn: "evaluate", engineFile: "reviewer.ts", cliFn: "runEvaluationStage" },
];

export { STAGE_SEQUENCE };
export type { PipelineStage };
