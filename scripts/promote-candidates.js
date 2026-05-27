#!/usr/bin/env node
// Hand-review tool: walk lexicons/_candidates, diff each candidate file
// against its canonical counterpart, ask y/n/q per net-new phrase, write
// keeps into canonical and drop them from candidate.
//
// Run: node scripts/promote-candidates.js

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const YAML = require("yaml");

const ROOT = path.join(__dirname, "..");
const CAND_DIR = path.join(ROOT, "lexicons", "_candidates");
const LEX_DIR = path.join(ROOT, "lexicons");

function readYaml(filePath) {
  try {
    return YAML.parse(fs.readFileSync(filePath, "utf8")) || null;
  } catch {
    return null;
  }
}

function writeYaml(filePath, doc) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(doc));
}

function ensureCanonical(roleFamily, seniority) {
  return {
    role_family: roleFamily,
    seniority,
    meeting_types: {},
  };
}

function ensureMeetingType(doc, meetingType) {
  if (!doc.meeting_types) doc.meeting_types = {};
  if (!doc.meeting_types[meetingType]) {
    doc.meeting_types[meetingType] = { prefer_terms: [], prefer_phrases: [], avoid_phrases: [] };
  }
  const m = doc.meeting_types[meetingType];
  if (!Array.isArray(m.prefer_terms)) m.prefer_terms = [];
  if (!Array.isArray(m.prefer_phrases)) m.prefer_phrases = [];
  if (!Array.isArray(m.avoid_phrases)) m.avoid_phrases = [];
  return m;
}

function listCandidateFiles() {
  if (!fs.existsSync(CAND_DIR)) return [];
  const out = [];
  for (const role of fs.readdirSync(CAND_DIR)) {
    const roleDir = path.join(CAND_DIR, role);
    if (!fs.statSync(roleDir).isDirectory()) continue;
    for (const file of fs.readdirSync(roleDir)) {
      if (!file.endsWith(".yaml")) continue;
      const seniority = file.replace(/\.yaml$/, "");
      out.push({ roleFamily: role, seniority, path: path.join(roleDir, file) });
    }
  }
  return out;
}

function netNewForMeeting(candM, canonM) {
  const seenTerms = new Set((canonM.prefer_terms || []).map((x) => String(x).toLowerCase()));
  const seenPhrases = new Set((canonM.prefer_phrases || []).map((x) => String(x).toLowerCase()));
  const seenAvoids = new Set((canonM.avoid_phrases || []).map((x) => String(x?.phrase || "").toLowerCase()));

  const items = [];
  for (const v of candM.prefer_terms || []) {
    if (!seenTerms.has(String(v).toLowerCase())) items.push({ kind: "prefer_term", value: v });
  }
  for (const v of candM.prefer_phrases || []) {
    if (!seenPhrases.has(String(v).toLowerCase())) items.push({ kind: "prefer_phrase", value: v });
  }
  for (const a of candM.avoid_phrases || []) {
    if (!seenAvoids.has(String(a?.phrase || "").toLowerCase())) items.push({ kind: "avoid_phrase", value: a });
  }
  return items;
}

function describe(item) {
  if (item.kind === "prefer_term") return `[term ]  "${item.value}"`;
  if (item.kind === "prefer_phrase") return `[phrase] "${item.value}"`;
  if (item.kind === "avoid_phrase") {
    const a = item.value;
    const better = a.better_as ? `  →  "${a.better_as}"` : "";
    const reason = a.reason ? `\n          reason: ${a.reason}` : "";
    return `[avoid ] "${a.phrase}"${better}${reason}`;
  }
  return JSON.stringify(item);
}

function applyKeep(canonM, item) {
  if (item.kind === "prefer_term") canonM.prefer_terms.push(item.value);
  else if (item.kind === "prefer_phrase") canonM.prefer_phrases.push(item.value);
  else if (item.kind === "avoid_phrase") canonM.avoid_phrases.push(item.value);
}

function removeFromCandidate(candM, item) {
  const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  if (item.kind === "prefer_term") {
    candM.prefer_terms = (candM.prefer_terms || []).filter((x) => !eq(x, item.value));
  } else if (item.kind === "prefer_phrase") {
    candM.prefer_phrases = (candM.prefer_phrases || []).filter((x) => !eq(x, item.value));
  } else if (item.kind === "avoid_phrase") {
    candM.avoid_phrases = (candM.avoid_phrases || []).filter((x) => !eq(x?.phrase, item.value?.phrase));
  }
}

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a)));
}

async function main() {
  const files = listCandidateFiles();
  if (!files.length) {
    console.log("\n  No candidate files in lexicons/_candidates/.\n");
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let promotedTotal = 0;
  let droppedTotal = 0;

  outer: for (const f of files) {
    const candDoc = readYaml(f.path);
    if (!candDoc || !candDoc.meeting_types) continue;

    const canonPath = path.join(LEX_DIR, f.roleFamily, `${f.seniority}.yaml`);
    let canonDoc = readYaml(canonPath) || ensureCanonical(f.roleFamily, f.seniority);

    let candChanged = false;
    let canonChanged = false;

    console.log(`\n  --- ${f.roleFamily} / ${f.seniority} ---`);
    console.log(`      candidate: ${path.relative(ROOT, f.path)}`);
    console.log(`      canonical: ${path.relative(ROOT, canonPath)}`);

    for (const meetingType of Object.keys(candDoc.meeting_types)) {
      const candM = candDoc.meeting_types[meetingType] || {};
      const canonM = ensureMeetingType(canonDoc, meetingType);
      const items = netNewForMeeting(candM, canonM);

      if (!items.length) {
        console.log(`      [${meetingType}] nothing new\n`);
        continue;
      }

      console.log(`      [${meetingType}] ${items.length} net-new\n`);

      for (const item of items) {
        console.log("   " + describe(item).split("\n").join("\n   "));
        const a = (await ask(rl, "   keep (y) / drop (n) / skip file (s) / quit (q)? ")).trim().toLowerCase();
        if (a === "q") break outer;
        if (a === "s") break;
        if (a === "y") {
          applyKeep(canonM, item);
          removeFromCandidate(candM, item);
          canonChanged = true;
          candChanged = true;
          promotedTotal += 1;
          console.log("     → promoted\n");
        } else if (a === "n") {
          removeFromCandidate(candM, item);
          candChanged = true;
          droppedTotal += 1;
          console.log("     → dropped\n");
        } else {
          console.log("     → left in candidate file\n");
        }
      }
    }

    if (canonChanged) writeYaml(canonPath, canonDoc);
    if (candChanged) writeYaml(f.path, candDoc);
  }

  rl.close();
  console.log(`\n  Done. promoted: ${promotedTotal}  dropped: ${droppedTotal}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
