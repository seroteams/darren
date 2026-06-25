const fs = require("node:fs");
const path = require("node:path");
const { findRunDir, reviewStatusOf, REVIEW_DIM_KEYS } = require("../../engine/run-history.ts");

// In-app Run Review (internal QA tooling). This handler is the ONLY writer of
// review.json and it writes NOTHING else — review mode never mutates the run's
// state, transcript, or notes. It does not use requireSession: finished runs
// have no live session, so it locates the run folder on disk by id (findRunDir
// rejects path-traversal ids).

// Canonical verdict dimensions (shared with reviewStatusOf via run-history).
const DIM_KEYS = REVIEW_DIM_KEYS;
const OVERALL_VALUES = ["keep", "fix", "block"];
const NOTE_CAP = 4000;

function readExisting(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "review.json"), "utf8"));
  } catch {
    return null;
  }
}

// Atomic write: stage to a temp file in the same dir, then rename over the
// target so a crash mid-write can never leave a torn review.json.
function writeAtomic(dir, data) {
  const target = path.join(dir, "review.json");
  const tmp = path.join(dir, "review.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, target);
}

async function review(c) {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const dir = findRunDir(id);
  if (!dir) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));

  const body = await c.readBody();
  if (!body || typeof body !== "object")
    return c.error(Object.assign(new Error("invalid payload"), { status: 400 }));
  const rawMarks = typeof body.marks === "object" && body.marks ? body.marks : {};

  // Strict schema: only the 8 known dimensions, only pass/fail/null. Unknown
  // keys are dropped; anything other than "pass"/"fail" becomes null.
  const marks = {};
  for (const key of DIM_KEYS) {
    const v = rawMarks[key];
    marks[key] = v === "pass" || v === "fail" ? v : null;
  }
  const overall = OVERALL_VALUES.includes(body.overall) ? body.overall : null;
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
    createdAt: prev && prev.createdAt ? prev.createdAt : now,
    updatedAt: now,
  };

  try {
    writeAtomic(dir, out);
  } catch (e) {
    return c.error(Object.assign(new Error("review write failed: " + e.message), { status: 500 }));
  }
  c.json(200, { ok: true, reviewStatus, overall, failedCount });
}

module.exports = { review };
