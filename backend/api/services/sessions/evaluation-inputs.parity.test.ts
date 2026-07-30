// Audit fix 2026-07-31 — the drift guard this repo keeps needing.
//
// The evaluation stage is wired TWICE: the live web lane builds its evaluate()
// payload as an inline literal in session-streams.ts, and buildEvaluationInputs()
// builds the same payload for the "Sending" preview. They are kept in step by
// hand, and the stage-parity guard only checks that each STAGE is invoked, not
// which fields it is invoked with. That is exactly how a field lands in a prompt
// and is then dropped by a narrowed call site.
//
// This is a tripwire, not a proof: it asserts every key the preview builder
// exposes is at least named inside the live evaluationStream body. Cheap, and it
// fails loudly the day someone adds an input to one side only.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildEvaluationInputs } from "./evaluation-inputs.ts";
import type { Session } from "../../../shared/session.types.ts";

// Path off the repo root, not import.meta: this file builds to CommonJS.
const STREAMS = path.join(process.cwd(), "backend/api/services/sessions/session-streams.ts");

function minimalSession(): Session {
  return {
    focusPointsResult: { focus_points: [] },
    ctx: { name: "D", role: "Engineer", seniority: "Mid", meetingType: "Bi-weekly check-in", notes: "" },
    notes: [],
    transcript: [],
    axisState: {},
    selectedFocusPoints: [],
  } as unknown as Session;
}

// The live lane derives these itself rather than reading them off the builder.
const LOCAL_TO_PREVIEW = new Set(["selectedFocus"]);

test("evaluation inputs: every preview key is still named in the live evaluationStream", () => {
  const source = fs.readFileSync(STREAMS, "utf8");
  const start = source.indexOf("export async function evaluationStream");
  assert.ok(start > 0, "evaluationStream must exist in session-streams.ts");
  const body = source.slice(start, source.indexOf("\nexport async function", start + 1));

  const missing = Object.keys(buildEvaluationInputs(minimalSession()))
    .filter((key) => !LOCAL_TO_PREVIEW.has(key))
    .filter((key) => !body.includes(`${key}:`) && !body.includes(`${key},`));

  assert.deepEqual(missing, [], `live evaluationStream no longer passes: ${missing.join(", ")}`);
});
