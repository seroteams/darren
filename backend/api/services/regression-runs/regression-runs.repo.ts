// Storage boundary for the regression rerun board: reads the frozen suite off
// disk (evals/golden/_index.json -> the case files -> their content/scenarios
// files) and, from Phase 2, the reruns those cases have produced.
//
// Naming note: the FREE replay service next door is already called "regression"
// (GET /api/v1/regression/run). Everything for the PAID rerun board is
// "regression-runs" so the two never collide.
//
// The suite is git-frozen on purpose: the scenarios are pure intake + positional
// canned answers, so they survive the engine being restructured. Answer N goes to
// whatever question N the engine asks today.

import fs from "node:fs";
import path from "node:path";
import { ROOT, CONTENT_DIR } from "../../../engine/paths.mts";

const GOLDEN_DIR = path.join(ROOT, "evals", "golden");

// What a case file ratifies: the verdict the trust checks should reach, and the
// hard-fail codes that are expected (an adversarial case may legitimately have
// none). Anything worse than this is a regression.
export interface CaseExpect {
  verdict: string;
  hard_fails: string[];
}

export interface SuiteCase {
  id: string;
  /** Display name of the person in the scenario, e.g. "Devon". */
  name: string;
  role: string;
  seniority: string;
  meetingType: string;
  /** "happy" | "adversarial" — adversarial cases can never be blessed into accepting a leak. */
  kind: string;
  expect: CaseExpect;
  /** The one-line human note from the case file, if it has one. */
  note: string;
  /** How many canned answers the scenario carries (thin suites degrade to skips). */
  answerCount: number;
  /** Repo-relative scenario path, for the fix brief and for Phase 2's runner. */
  scenarioPath: string;
}

/** A finished rerun of one case. Filled in from Phase 2; empty until then. */
export interface RerunRow {
  caseId: string;
  runId: string;
  batchId: string;
  finishedAt: string | null;
}

export interface RegressionRunsRepo {
  listSuite(): SuiteCase[];
  listReruns(): Promise<RerunRow[]>;
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function readExpect(raw: unknown): CaseExpect {
  const e = asRecord(raw);
  const fails = Array.isArray(e.hard_fails) ? e.hard_fails.filter((f): f is string => typeof f === "string") : [];
  return { verdict: asString(e.verdict, "PASS"), hard_fails: fails };
}

// One suite case = the golden ratification + the scenario it points at. A case
// whose scenario is missing is skipped rather than crashing the board: a broken
// pointer should not take the screen down.
function loadCase(id: string, file: string): SuiteCase | null {
  const defPath = path.join(GOLDEN_DIR, file);
  if (!fs.existsSync(defPath)) return null;
  const def = asRecord(readJson(defPath));

  const scenarioRel = asString(def.scenario);
  const scenarioAbs = path.join(CONTENT_DIR, scenarioRel);
  if (!scenarioRel || !fs.existsSync(scenarioAbs)) return null;
  const scenario = asRecord(readJson(scenarioAbs));

  const answers = Array.isArray(scenario.answers) ? scenario.answers : [];

  return {
    id,
    name: asString(scenario.name, id),
    role: asString(scenario.role),
    seniority: asString(scenario.seniority),
    meetingType: asString(scenario.meeting_type),
    kind: asString(def.kind, "happy"),
    expect: readExpect(def.expect),
    note: asString(def.human_label),
    answerCount: answers.length,
    scenarioPath: path.posix.join("content", scenarioRel.split(path.sep).join("/")),
  };
}

export function createRegressionRunsRepo(): RegressionRunsRepo {
  return {
    listSuite() {
      const index = readJson(path.join(GOLDEN_DIR, "_index.json"));
      if (!Array.isArray(index)) return [];
      const cases: SuiteCase[] = [];
      for (const entry of index) {
        const e = asRecord(entry);
        const id = asString(e.id);
        const file = asString(e.file);
        if (!id || !file) continue;
        const loaded = loadCase(id, file);
        if (loaded) cases.push(loaded);
      }
      return cases;
    },

    // Phase 2 fills this in from the sessions store (run_label "regression:<batch>:<case>").
    // Until then the board honestly shows every case as never rerun.
    async listReruns() {
      return [];
    },
  };
}
