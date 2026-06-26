import fs from "node:fs";
import path from "node:path";
import { findRunDir, reviewStatusOf, REVIEW_DIM_KEYS } from "../../engine/run-history.ts";
import type { RequestContext } from "../router.ts";

// In-app Run Review (internal QA tooling). This handler is the ONLY writer of
// review.json and it writes NOTHING else — review mode never mutates the run's
// state, transcript, or notes. It does not use requireSession: finished runs
// have no live session, so it locates the run folder on disk by id (findRunDir
// rejects path-traversal ids).

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

// Canonical verdict dimensions (shared with reviewStatusOf via run-history).
const DIM_KEYS = REVIEW_DIM_KEYS;
const OVERALL_VALUES = ["keep", "fix", "block"];
const NOTE_CAP = 4000;

function readExisting(dir: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "review.json"), "utf8"));
  } catch {
    return null;
  }
}

// Atomic write: stage to a temp file in the same dir, then rename over the
// target so a crash mid-write can never leave a torn review.json.
function writeAtomic(dir: string, data: unknown): void {
  const target = path.join(dir, "review.json");
  const tmp = path.join(dir, "review.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, target);
}

async function review(c: RequestContext): Promise<void> {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const dir = findRunDir(id);
  if (!dir) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));

  const body = await c.readBody();
  if (!isObjectRecord(body))
    return c.error(Object.assign(new Error("invalid payload"), { status: 400 }));
  const rawMarks = asRecord(body.marks);

  // Strict schema: only the 8 known dimensions, only pass/fail/null. Unknown
  // keys are dropped; anything other than "pass"/"fail" becomes null.
  const marks: Record<string, "pass" | "fail" | null> = {};
  for (const key of DIM_KEYS) {
    const v = rawMarks[key];
    marks[key] = v === "pass" || v === "fail" ? v : null;
  }
  const rawOverall = body.overall;
  const overall = typeof rawOverall === "string" && OVERALL_VALUES.includes(rawOverall) ? rawOverall : null;
  const note = String(body.note != null ? body.note : "").slice(0, NOTE_CAP);

  const reviewStatus = reviewStatusOf({ marks });
  const failedCount = DIM_KEYS.filter((k) => marks[k] === "fail").length;
  const prev = readExisting(dir);
  const now = new Date().toISOString();

  const out = {
    version: 1,
    runId: id,
    reviewer: "carl",
    marks,
    overall,
    note,
    createdAt: isObjectRecord(prev) && prev.createdAt ? prev.createdAt : now,
    updatedAt: now,
  };

  try {
    writeAtomic(dir, out);
  } catch (e) {
    return c.error(Object.assign(new Error("review write failed: " + (e instanceof Error ? e.message : String(e))), { status: 500 }));
  }
  c.json(200, { ok: true, reviewStatus, overall, failedCount });
}

export { review };
