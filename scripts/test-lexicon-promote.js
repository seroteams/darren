#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const {
  listPendingPromotions,
  applyPromotionDecisions,
} = require("../src/lexicon/promote-core");

const ROOT = path.join(__dirname, "..");
const CAND = path.join(ROOT, "lexicons/_candidates/engineering");
const CAND_FILE = path.join(CAND, "lead.yaml");
const CANON_DIR = path.join(ROOT, "lexicons/engineering");
const CANON_FILE = path.join(CANON_DIR, "lead.yaml");

const candBackup = fs.existsSync(CAND_FILE) ? fs.readFileSync(CAND_FILE, "utf8") : null;
const canonBackup = fs.existsSync(CANON_FILE) ? fs.readFileSync(CANON_FILE, "utf8") : null;

try {
  fs.mkdirSync(CAND, { recursive: true });
  fs.writeFileSync(
    CAND_FILE,
    YAML.stringify({
      role_family: "engineering",
      seniority: "lead",
      meeting_types: {
        growth: {
          prefer_terms: [],
          prefer_phrases: ["__test_promote_phrase__"],
          avoid_phrases: [],
        },
      },
    })
  );
  if (canonBackup) fs.writeFileSync(CANON_FILE, canonBackup);
  else if (fs.existsSync(CANON_FILE)) fs.unlinkSync(CANON_FILE);

  const pending = listPendingPromotions();
  const item = pending.find((p) => p.phrase.includes("__test_promote_phrase__"));
  assert.ok(item, "pending item found");

  const result = applyPromotionDecisions([{ id: item.id, keep: true }]);
  assert.equal(result.promoted, 1);

  const canon = YAML.parse(fs.readFileSync(CANON_FILE, "utf8"));
  assert.ok(canon.meeting_types.growth.prefer_phrases.includes("__test_promote_phrase__"));

  const stillPending = listPendingPromotions().some((p) => p.id === item.id);
  assert.equal(stillPending, false);

  console.log("PASS test-lexicon-promote");
} finally {
  if (candBackup != null) fs.writeFileSync(CAND_FILE, candBackup);
  else if (fs.existsSync(CAND_FILE)) fs.unlinkSync(CAND_FILE);
  if (canonBackup != null) fs.writeFileSync(CANON_FILE, canonBackup);
  else if (fs.existsSync(CANON_FILE)) fs.unlinkSync(CANON_FILE);
}
