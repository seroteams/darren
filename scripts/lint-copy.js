#!/usr/bin/env node
/*
 * lint-copy.js — the no-em-dash prose guard.
 *
 * SERO SOLID RULE: em dashes never appear in user-facing copy. Carl's call,
 * 2026-07-21 ("I NEVER EVER want to see em dashes on Sero"). An em dash (—) reads
 * as machine-written; Sero copy uses a full stop, a colon, or a rewrite instead.
 *
 * Pure Node (fs + regex). NO deps, NO install, NO network, NO OpenAI — always free.
 * Sibling of scripts/lint-design-tokens.js; same comment-stripping so a dash inside
 * a code comment or JSDoc never trips the guard — only dashes in real string content
 * (the text that ships to a screen) count.
 *
 *   ERROR (fails the build):
 *     · em-dash        — a — (U+2014) in string content
 *     · en-dash-sep    — a spaced en dash ( – , U+2013 used as an em dash) in string content
 *
 * Exemptions:
 *   whole files — dev-badge.js, build-stamp.js (terminal-style dev chrome, not product copy).
 *   single line — add `lint-copy-ignore` in a comment on the line (with a reason).
 *
 * Usage:  node scripts/lint-copy.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["admin/src", "frontend/src"];
const EXTS = new Set([".js", ".ts", ".css"]);

const ALLOWLIST = [
  /(^|[\\/])dev-badge\.js$/,
  /(^|[\\/])build-stamp\.js$/,
];

const isAllowlisted = (rel) => ALLOWLIST.some((re) => re.test(rel));

// --- file walk ---------------------------------------------------------------
function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === "build") continue;
      walk(full, out);
    } else if (EXTS.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

// --- comment stripping (so a dash inside a comment never trips the guard) ------
// Returns { code, inBlock } — `code` has comment spans blanked out.
function stripComments(line, inBlock) {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (inBlock) {
      const end = line.indexOf("*/", i);
      if (end === -1) return { code: out, inBlock: true };
      i = end + 2;
      inBlock = false;
      continue;
    }
    if (line[i] === "/" && line[i + 1] === "*") {
      inBlock = true;
      i += 2;
      continue;
    }
    if (line[i] === "/" && line[i + 1] === "/") break; // line comment → rest is comment
    out += line[i++];
  }
  return { code: out, inBlock };
}

// --- rules -------------------------------------------------------------------
const EM_DASH = /—/; // —
const EN_DASH_SEP = /\s–\s/; // spaced en dash used as an em dash: " – "

function checkLine(rel, lineNo, rawLine, state, acc) {
  const stripped = stripComments(rawLine, state.inBlock);
  state.inBlock = stripped.inBlock;
  const text = stripped.code;
  if (!text.trim()) return;
  if (/lint-copy-ignore/.test(rawLine)) return; // explicit per-line waiver

  if (EM_DASH.test(text)) acc.errors.push({ rel, lineNo, rule: "em-dash", snippet: text.trim() });
  else if (EN_DASH_SEP.test(text)) acc.errors.push({ rel, lineNo, rule: "en-dash-sep", snippet: text.trim() });
}

// --- run ---------------------------------------------------------------------
const files = [];
for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);

const acc = { errors: [] };
let scanned = 0;
for (const abs of files) {
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  if (isAllowlisted(rel)) continue;
  scanned++;
  const state = { inBlock: false };
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => checkLine(rel, i + 1, line, state, acc));
}

const group = (list) => {
  const by = {};
  for (const e of list) (by[e.rule] ||= []).push(e);
  return by;
};

console.log(`\nno-em-dash copy guard — scanned ${scanned} files under ${SCAN_DIRS.join(", ")}\n`);

if (acc.errors.length) {
  const by = group(acc.errors);
  console.log(`✗ ${acc.errors.length} em-dash violation(s):\n`);
  for (const rule of Object.keys(by)) {
    console.log(`  [${rule}] — ${by[rule].length}`);
    for (const e of by[rule]) console.log(`    ${e.rel}:${e.lineNo}  ${e.snippet}`);
  }
  console.log("");
  console.log(`FAIL — em dashes are banned in Sero copy. Rewrite with a full stop, colon, or reword; or add a 'lint-copy-ignore' comment with a reason.\n`);
  process.exit(1);
} else {
  console.log(`PASS — no em dashes in copy.\n`);
  process.exit(0);
}
