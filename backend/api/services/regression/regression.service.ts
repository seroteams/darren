// Regression logic: run the offline replay suite and map each case to the API
// shape. No storage — the suite runner is the injected boundary (so tests can
// stand it in). Never touches req/res.

export interface SuiteCaseResult {
  id: string;
  name: string;
  meetingType: string;
  issue?: unknown; // the replay suite types this loosely ({} | null) — keep it broad
  kind: string;
  status: string;
  verdict: unknown;
  expectedVerdict: unknown;
  hardFails?: string[];
  reasons?: string[];
  error?: string | null;
}

export interface SuiteOutcome {
  verdict: string;
  summary: unknown;
  results: SuiteCaseResult[];
}

export type SuiteRunner = () => SuiteOutcome;

export interface RegressionCase {
  id: string;
  name: string;
  meetingType: string;
  issue: unknown;
  kind: string;
  status: string;
  verdict: unknown;
  expectedVerdict: unknown;
  hardFails: string[];
  reasons: string[];
  error: string | null;
}

export interface RegressionResult {
  verdict: string;
  summary: unknown;
  cases: RegressionCase[];
}

export interface RegressionService {
  run(): RegressionResult;
}

export function createRegressionService(runSuite: SuiteRunner): RegressionService {
  return {
    run() {
      const { verdict, summary, results } = runSuite();
      const cases = results.map((r) => ({
        id: r.id,
        name: r.name,
        meetingType: r.meetingType,
        issue: r.issue ?? null,
        kind: r.kind,
        status: r.status,
        verdict: r.verdict,
        expectedVerdict: r.expectedVerdict,
        hardFails: r.hardFails || [],
        reasons: r.reasons || [],
        error: r.error || null,
      }));
      return { verdict, summary, cases };
    },
  };
}
