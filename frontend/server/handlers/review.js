const fs = require("node:fs");
const path = require("node:path");
const { findRunDir, reviewStatusOf, REVIEW_DIM_KEYS } = require("../../../src/run-history");

// In-app Run Review (internal QA tooling). This handler is the ONLY writer of
// review.json and it writes NOTHING else — review mode never mutates the run's
// state, transcript, or notes. It does not use requireSession: finished runs
// have no live session, so it locates the run folder on disk by id.

// Canonical verdict dimensions (shared with reviewStatusOf via run-history).
const DIM_KEYS = REVIEW_DIM_KEYS;
const NOTE_CAP = 4000;

async function review(c) {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const dir = findRunDir(id);
  if (!dir) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));

  const body = await c.readBody();
  const rawMarks = body && typeof body.marks === "object" && body.marks ? body.marks : {};

  // Strict schema: only the 8 known dimensions, only pass/fail/null. Unknown
  // keys are dropped; anything other than "pass"/"fail" becomes null.
  const marks = {};
  for (const key of DIM_KEYS) {
    const v = rawMarks[key];
    marks[key] = v === "pass" || v === "fail" ? v : null;
  }
  const note = String(body && body.note != null ? body.note : "").slice(0, NOTE_CAP);
  const reviewStatus = reviewStatusOf({ marks });
  const out = { version: 1, marks, note, reviewStatus, ts: Date.now() };

  try {
    fs.writeFileSync(path.join(dir, "review.json"), JSON.stringify(out, null, 2));
  } catch (e) {
    return c.error(Object.assign(new Error("review write failed: " + e.message), { status: 500 }));
  }
  c.json(200, { ok: true, reviewStatus });
}

module.exports = { review };
