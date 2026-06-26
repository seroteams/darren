#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { MEETING_TYPES } = require("../backend/engine/meeting-types.ts");
const { scriptedQuestions } = require("../backend/api/persona-script.ts");
const { CONFIG_DIR } = require("../backend/engine/paths.mts");

const BENCH_PATH = path.join(CONFIG_DIR, "persona-bench-v1.json");

// Scripted aliases that genuinely carry no bank signature today: the open-cover
// opener and the relational "observed" prompts. Parked (engine-trust-gates
// PLAN). The test fails if any OTHER alias stops resolving — that's the
// alias-bridge regression (q_ vs q_q_) coming back.
const PARKED_NO_SIGNATURE = new Set([
  "q_open_anything_to_cover",
  "q_alignment_observed",
  "q_handoff_observed",
  "q_call_quality",
]);

const REQUIRED_STRINGS = [
  "id",
  "name",
  "displayName",
  "role",
  "seniority",
  "meeting_type",
  "issue",
  "notes",
];

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

const raw = fs.readFileSync(BENCH_PATH, "utf8");
const data = JSON.parse(raw);
const personas = data.personas;

if (!Array.isArray(personas)) fail("personas must be an array");
if (personas.length !== 12) fail(`expected 12 personas, got ${personas.length}`);

const ids = new Set();
const orders = new Set();
const labels = new Set(MEETING_TYPES.map((t) => t.label));

for (const p of personas) {
  if (!Number.isInteger(p.order) || p.order < 1 || p.order > 12) {
    fail(`${p.id}: order must be 1–12`);
  }
  for (const key of REQUIRED_STRINGS) {
    if (typeof p[key] !== "string" || !p[key].trim()) {
      fail(`${p.id || "(no id)"}: missing or empty ${key}`);
    }
  }
  if (ids.has(p.id)) fail(`duplicate id: ${p.id}`);
  ids.add(p.id);
  if (orders.has(p.order)) fail(`duplicate order: ${p.order}`);
  orders.add(p.order);

  if (!labels.has(p.meeting_type)) {
    fail(`${p.id}: unknown meeting_type "${p.meeting_type}"`);
  }

  const idx = MEETING_TYPES.findIndex((t) => t.label === p.meeting_type);
  if (idx < 0) fail(`${p.id}: meetingTypeIndex would be -1`);

  if (p.notes.includes(p.issue)) {
    fail(`${p.id}: notes must not contain issue text`);
  }
}

for (let i = 1; i <= 12; i++) {
  if (!orders.has(i)) fail(`missing order ${i}`);
}

const sorted = [...personas].sort((a, b) => a.order - b.order);
if (sorted[0].id !== "maya-chen") fail("order 1 should be maya-chen");
if (sorted[11].id !== "daniel-ruiz") fail("order 12 should be daniel-ruiz");

// Every scripted question must resolve a real axis signature (via its own
// effects or the bank), or clampToSignature zeroes the turn and the run ships
// every axis "not read". Only the parked openers/observed prompts may be empty.
const unresolved = new Set();
for (const p of personas) {
  for (const q of scriptedQuestions(p)) {
    const hasSig = q.axis_effects && Object.keys(q.axis_effects).length > 0;
    if (!hasSig && !PARKED_NO_SIGNATURE.has(q.alias)) unresolved.add(q.alias);
  }
}
if (unresolved.size) {
  fail(`scripted aliases with no resolvable axis signature: ${[...unresolved].sort().join(", ")}`);
}

console.log("OK: persona-bench-v1.json (12 personas, meeting types, orders, axis signatures)");
