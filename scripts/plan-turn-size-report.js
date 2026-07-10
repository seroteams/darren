#!/usr/bin/env node
// Plan-turn prompt size report (free, offline — no API).
//
// Two views of where the plan-turn prompt's tokens go, both in the o200k_base
// encoding gpt-5.x actually bills (matches real prompt_tokens within ~2%; the
// gap is the JSON schema + message-role wrappers, a fixed ~240 tokens on top).
//
//   1. TEMPLATE SECTIONS — tokenize each <tagged> block of the System half of
//      content/prompts/plan-turn.md. These are the fixed instruction tokens that
//      repeat every turn — the cut targets.
//   2. REAL FILLED PROMPTS — tokenize the actual per-turn prompt.md files logged
//      by real runs, so we see the true sent size (instructions + live data).
//
// Cache cliff: OpenAI stopped caching gpt-5.4 prompts above ~8.7k–10k tokens
// (~June 2026). Target: every filled prompt ≤ 8.5k tokens.

const fs = require("node:fs");
const path = require("node:path");
const { encode } = require("gpt-tokenizer/encoding/o200k_base");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE = path.join(ROOT, "content/prompts/plan-turn.md");
const API_OVERHEAD = 240; // schema + message wrappers OpenAI adds beyond the text
// Cache cliff pinned by live probe 2026-07-10: caches at 9,502 tok, dead at 9,795.
// Target sits with headroom below the ~9,600 cliff.
const TARGET = 9300;

// Real logged scenarios (varied meeting types) — the ground-truth filled prompts.
const SCENARIOS = [
  { label: "bi-weekly", dir: "logs/july/2026_Jul09_00-35-b8b3992632c549cf9c72c63a918c8f7b" },
  { label: "feels-off", dir: "logs/july/2026_Jul08_08-49-b53b8b2498d64297ba7b84732e0aca04" },
  { label: "performance", dir: "logs/july/2026_Jul07_07-37-4af67a1eba5e46afa737098417ffbe0f" },
];

const tok = (s) => encode(s).length;

function splitSystemUser(filled) {
  const system = filled.match(/## System\s+([\s\S]*?)\n## User/)?.[1]?.trim() ?? "";
  const user = filled.match(/## User\s+([\s\S]*)$/)?.[1]?.trim() ?? filled;
  return { system, user };
}

function sectionBreakdown() {
  const raw = fs.readFileSync(TEMPLATE, "utf8");
  const { system } = splitSystemUser(raw);
  // Structural section tags sit alone on their own line (^<tag>$ ... ^</tag>$).
  // Prose references the same names inline (e.g. "see `<decision_order>`"), so
  // an unanchored regex would mis-pair an inline mention with a real close tag
  // and swallow everything between. Anchor to line-start opens/closes only.
  const rows = [];
  const openRe = /^<([a-z_]+)>$/gm;
  let m;
  while ((m = openRe.exec(system))) {
    const name = m[1];
    const closeIdx = system.indexOf(`\n</${name}>`, m.index);
    if (closeIdx === -1) continue;
    const body = system.slice(m.index + m[0].length, closeIdx);
    rows.push({ name, tokens: tok(body) });
  }
  const tagged = rows.reduce((a, r) => a + r.tokens, 0);
  const systemTotal = tok(system);
  return { rows: rows.sort((a, b) => b.tokens - a.tokens), tagged, systemTotal, untagged: systemTotal - tagged };
}

// The current template's System half — what every turn WOULD send now (the
// logged prompts used the old template, so we can't just read them back).
function currentSystemTokens() {
  const { system } = splitSystemUser(fs.readFileSync(TEMPLATE, "utf8"));
  return tok(system);
}

// messages.ts now compacts the fenced JSON data blocks (single-line). Mirror
// that here so the User measurement matches what the engine now assembles.
function compactUser(user) {
  return user.replace(/```json\n([\s\S]*?)```/g, (m, j) => {
    try {
      return "```json\n" + JSON.stringify(JSON.parse(j)) + "\n```";
    } catch {
      return m;
    }
  });
}

const CUR_SYS = currentSystemTokens();

function scenarioTurns(dir) {
  const abs = path.join(ROOT, dir, "04-dynamic-answers");
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => /^\d+-prompt\.md$/.test(f))
    .sort()
    .map((f) => {
      const { user } = splitSystemUser(fs.readFileSync(path.join(abs, f), "utf8"));
      // NEW filled size = current slimmed System + this turn's data (compacted).
      const usrT = tok(compactUser(user));
      return { turn: f.slice(0, 2), sys: CUR_SYS, usr: usrT, billed: CUR_SYS + usrT + API_OVERHEAD };
    });
}

function pad(s, n) {
  return String(s).padEnd(n);
}
function rpad(s, n) {
  return String(s).padStart(n);
}

console.log("\n=== PLAN-TURN SIZE REPORT (o200k_base; +" + API_OVERHEAD + " tok API overhead) ===");
console.log("Target: every filled prompt <= " + TARGET + " tokens\n");

// View 1 — template sections (the fixed instruction cost, the cut targets)
const sec = sectionBreakdown();
console.log("--- SYSTEM TEMPLATE SECTIONS (repeat every turn) ---");
for (const r of sec.rows) console.log("  " + pad(r.name, 20) + rpad(r.tokens, 7) + " tok");
console.log("  " + pad("(untagged glue)", 20) + rpad(sec.untagged, 7) + " tok");
console.log("  " + pad("SYSTEM TOTAL", 20) + rpad(sec.systemTotal, 7) + " tok\n");

// View 2 — real filled prompts per turn
console.log("--- REAL FILLED PROMPTS (billed size per turn) ---");
let worst = 0;
const allBilled = [];
for (const s of SCENARIOS) {
  const turns = scenarioTurns(s.dir);
  if (!turns.length) {
    console.log("  " + pad(s.label, 13) + " (no logs found)");
    continue;
  }
  const bills = turns.map((t) => t.billed);
  const max = Math.max(...bills);
  const min = Math.min(...bills);
  worst = Math.max(worst, max);
  allBilled.push(...bills);
  console.log(
    "  " + pad(s.label, 13) + "turns=" + turns.length +
    "  billed min/max = " + min + " / " + max +
    "  (sys~" + turns[0].sys + " fixed, usr " + Math.min(...turns.map((t) => t.usr)) + "-" + Math.max(...turns.map((t) => t.usr)) + ")"
  );
}
const avg = Math.round(allBilled.reduce((a, b) => a + b, 0) / allBilled.length);
console.log("\n  Worst filled prompt: " + worst + " tok   Avg: " + avg + " tok");
console.log("  Over target by: " + (worst - TARGET) + " tok  →  must cut >= " + (worst - TARGET) + " from the fixed instructions\n");
