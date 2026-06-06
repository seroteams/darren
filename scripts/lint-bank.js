#!/usr/bin/env node
// Phase-0 DIAGNOSTIC lint over the question bank. Reports only — gates nothing.
// (Phase 1 will promote these rules into src/question-validator.js as a real gate.)
//
// Run: node scripts/lint-bank.js                # human scorecard
//      node scripts/lint-bank.js --json         # machine report to stdout
//      node scripts/lint-bank.js --out <file>   # also write JSON report
//
// Rules are intentionally conservative; "Can you walk me through…" is EXEMPT
// because the QA sweep rated it the single strongest question shape.

const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");

const ROOT = path.join(__dirname, "..");
const QUESTIONS_DIR = path.join(ROOT, "questions");

// --- rule predicates (pure; exported for reuse) ---------------------------
const WALK_ME_THROUGH = /^(can|could) you walk me through\b/i;
const YES_NO_OPENER = /^(is|are|do|does|did|can|could|would|will|should|have|has|had|was|were|am)\b/i;
const PRESUP_START = /^(when|now that|given that|since)\b/i;
const PRESUP_WORDS = /(unclear|wrong|missing|failing|broken|weak|lacking|isn't|aren't|not working|underperform)/i;
// Phrases that, if asserted in a *served* question, would leak a private manager judgement.
const TRUST_RISK = /\b(burnout|burnt out|borderline|too low|under-?perform|on a pip|being considered for|up for promotion|promotion to|worried about your|your performance is)\b/i;

function isYesNoDeadEnd(name) {
  const n = name.trim();
  if (WALK_ME_THROUGH.test(n)) return false; // strongest shape, exempt
  return YES_NO_OPENER.test(n);
}
function isPresupposed(name) {
  const n = name.trim();
  return PRESUP_START.test(n) && PRESUP_WORDS.test(n);
}
function isMultiProbe(name) {
  return (name.match(/\?/g) || []).length > 1;
}
function isTrustRisk(name) {
  return TRUST_RISK.test(name);
}

// --- bank loading ---------------------------------------------------------
function loadBank(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".yaml") || f.startsWith("_")) continue;
    let y;
    try { y = YAML.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
    if (y && y.name) out.push({ file: f, alias: y.alias || f.replace(/\.yaml$/, ""), name: String(y.name), description: y.description, purpose: y.purpose, source: String(y.source || "") });
  }
  return out;
}

function familyBase(alias) {
  return String(alias).replace(/_\d+$/, "");
}

function lintBank(dir = QUESTIONS_DIR) {
  const q = loadBank(dir);
  const N = q.length || 1;
  const yesno = q.filter((x) => isYesNoDeadEnd(x.name));
  const presup = q.filter((x) => isPresupposed(x.name));
  const multi = q.filter((x) => isMultiProbe(x.name));
  const noDesc = q.filter((x) => !x.description || !String(x.description).trim());
  const noPurpose = q.filter((x) => !x.purpose || !String(x.purpose).trim());
  const trust = q.filter((x) => isTrustRisk(x.name));
  const reworded = q.filter((x) => /reworded_from/.test(x.source));

  const fam = {};
  for (const x of q) (fam[familyBase(x.alias)] = fam[familyBase(x.alias)] || []).push(x.alias);
  const bigFam = Object.entries(fam).filter(([, v]) => v.length >= 3).sort((a, b) => b[1].length - a[1].length);
  const redundantCopies = Object.values(fam).reduce((s, v) => s + (v.length > 1 ? v.length - 1 : 0), 0);

  return {
    total: q.length,
    pct: (n) => Math.round((n / N) * 100),
    findings: {
      yes_no_dead_end: yesno,
      presupposed_premise: presup,
      multi_probe: multi,
      missing_description: noDesc,
      missing_purpose: noPurpose,
      trust_risk_phrasing: trust,
      reworded_adhoc: reworded,
    },
    near_dup_families: bigFam.map(([base, aliases]) => ({ base, count: aliases.length })),
    redundant_copies: redundantCopies,
  };
}

function printScorecard(r) {
  const p = r.pct;
  const row = (label, arr) => `  ${label.padEnd(34)} ${String(arr.length).padStart(4)}  (${p(arr.length)}%)`;
  console.log(`\nBANK LINT — diagnostic only (n=${r.total} stored questions, _-prefixed excluded)`);
  console.log("=".repeat(60));
  console.log(row("Yes/no dead-end (walk-me-through OK)", r.findings.yes_no_dead_end));
  console.log(row("Presupposed-premise shape", r.findings.presupposed_premise));
  console.log(row("Multi-probe (2+ '?')", r.findings.multi_probe));
  console.log(row("Missing description", r.findings.missing_description));
  console.log(row("Missing purpose", r.findings.missing_purpose));
  console.log(row("Trust-risk phrasing (leak-prone)", r.findings.trust_risk_phrasing));
  console.log(row("reworded_from (ad-hoc variants)", r.findings.reworded_adhoc));
  console.log(`  ${"Redundant near-dup copies".padEnd(34)} ${String(r.redundant_copies).padStart(4)}  (${p(r.redundant_copies)}%)  across ${r.near_dup_families.length} families`);
  console.log("=".repeat(60));
  if (r.findings.yes_no_dead_end.length) {
    console.log("Sample yes/no dead-ends:");
    r.findings.yes_no_dead_end.slice(0, 8).forEach((x) => console.log(`  - [${x.alias}] ${x.name}`));
  }
  if (r.findings.trust_risk_phrasing.length) {
    console.log("Trust-risk phrasings:");
    r.findings.trust_risk_phrasing.slice(0, 8).forEach((x) => console.log(`  - [${x.alias}] ${x.name}`));
  }
  console.log("Biggest near-dup families:");
  r.near_dup_families.slice(0, 8).forEach((f) => console.log(`  - ${f.base} x${f.count}`));
  console.log();
}

function toReport(r) {
  const counts = Object.fromEntries(Object.entries(r.findings).map(([k, v]) => [k, v.length]));
  return {
    total: r.total,
    counts,
    pct: Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, r.pct(n)])),
    redundant_copies: r.redundant_copies,
    near_dup_families: r.near_dup_families,
    examples: Object.fromEntries(Object.entries(r.findings).map(([k, v]) => [k, v.slice(0, 12).map((x) => ({ alias: x.alias, name: x.name }))])),
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const r = lintBank();
  const outIdx = args.indexOf("--out");
  if (outIdx >= 0 && args[outIdx + 1]) {
    fs.mkdirSync(path.dirname(args[outIdx + 1]), { recursive: true });
    fs.writeFileSync(args[outIdx + 1], JSON.stringify(toReport(r), null, 2));
    console.error(`wrote ${args[outIdx + 1]}`);
  }
  if (args.includes("--json")) console.log(JSON.stringify(toReport(r), null, 2));
  else printScorecard(r);
}

module.exports = { lintBank, toReport, isYesNoDeadEnd, isPresupposed, isMultiProbe, isTrustRisk };
