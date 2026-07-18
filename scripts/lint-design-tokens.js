#!/usr/bin/env node
/*
 * lint-design-tokens.js — the design-system drift guard (design-system-tokens plan, P6).
 *
 * Pure Node (fs + regex). NO deps, NO install, NO network, NO OpenAI — always free.
 * Walks admin/src + frontend/src for .css/.js/.ts and fails (exit 1) on design-token
 * integrity violations that a human reviewer would otherwise have to catch by eye:
 *
 *   ERROR (fails the build):
 *     · raw-hex        — a #rgb/#rrggbb colour literal used as a value (not in a token def)
 *     · rgb-literal    — an rgb()/rgba() colour literal used as a value (not in a token def)
 *     · hex-fallback   — a var(--token, #hex | rgba(...)) fallback (drop it; tokens always exist)
 *     · sub-14px-font  — font-size below the 14px accessibility floor (DESIGN §3)
 *
 *   WARN (reported, does NOT fail): non-token font-size literal >=14px.
 *   REPORT ONLY (with --report): off-grid spacing + literal border-radius counts.
 *
 * Exemptions (DESIGN §6 + the sweep's documented decorative signatures):
 *   whole files — tokens.css (the source of truth), dev-badge.js, build-stamp.js,
 *   stages/design.js (the live design sheet), universe.*, orb.css + motion.css
 *   (decorative animation signatures), app-nav.css (dark-rail on-dark translucency),
 *   app-nav.js + session-topbar.js (the brandmark LOGO SVG). Plus any *.test.* file.
 *   single line — add `lint-tokens-ignore` in a comment on the line (with a reason).
 *   token definitions — a line that assigns to a `--custom-property` may hold raw values.
 *
 * Usage:  node scripts/lint-design-tokens.js [--report]
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["admin/src", "frontend/src"];
const EXTS = new Set([".css", ".js", ".ts"]);

const ALLOWLIST = [
  /(^|[\\/])tokens\.css$/,
  /(^|[\\/])dev-badge\.js$/,
  /(^|[\\/])build-stamp\.js$/,
  /(^|[\\/])stages[\\/]design\.js$/,
  /universe\./,
  /(^|[\\/])orb\.css$/, // decorative thinking-orb gradient (signature)
  /(^|[\\/])motion\.css$/, // decorative aura/shimmer (signature)
  /(^|[\\/])app-nav\.css$/, // dark-rail on-dark alpha-white translucency (no token home)
  /(^|[\\/])app-nav\.js$/, // brandmark LOGO SVG (both apps)
  /(^|[\\/])session-topbar\.js$/, // brandmark LOGO SVG
  /\.test\./,
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

// --- comment stripping (so hex/rgba inside comments never trip the guard) -----
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
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGB = /\brgba?\(/;
const VAR_FALLBACK_LITERAL = /var\(\s*--[a-z0-9-]+\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\()/i;
const IS_TOKEN_DEF = /^\s*--[a-z0-9-]+\s*:/i; // a custom-property definition may hold raw values
const FONT_SIZE_PX = /font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px/gi;
const RADIUS_PX = /border-radius\s*:\s*([0-9]+(?:\.[0-9]+)?)px/gi;
const SPACING_PX = /\b(?:padding|margin|gap)(?:-[a-z]+)?\s*:\s*([^;{}]*)/gi;

function checkLine(rel, lineNo, rawLine, state, acc) {
  const stripped = stripComments(rawLine, state.inBlock);
  state.inBlock = stripped.inBlock;
  const text = stripped.code;
  if (!text.trim()) return;
  if (/lint-tokens-ignore/.test(rawLine)) return; // explicit per-line waiver

  const tokenDef = IS_TOKEN_DEF.test(text);

  // var(--x, <literal>) fallback — always a violation (drop the fallback)
  if (VAR_FALLBACK_LITERAL.test(text)) {
    acc.errors.push({ rel, lineNo, rule: "hex-fallback", snippet: text.trim() });
  }
  // Raw colour literals OUTSIDE any var() — strip var(...) first (nesting-safe) so a
  // fallback's inner hex isn't double-counted, then check what remains. Token-definition
  // lines may legitimately hold raw values.
  if (!tokenDef) {
    let bare = text;
    let prev;
    do {
      prev = bare;
      bare = bare.replace(/var\([^()]*\)/g, "");
    } while (bare !== prev);
    if (HEX.test(bare)) acc.errors.push({ rel, lineNo, rule: "raw-hex", snippet: text.trim() });
    if (RGB.test(bare)) acc.errors.push({ rel, lineNo, rule: "rgb-literal", snippet: text.trim() });
  }

  // font-size floor
  let m;
  FONT_SIZE_PX.lastIndex = 0;
  while ((m = FONT_SIZE_PX.exec(text))) {
    const px = parseFloat(m[1]);
    if (px < 14) acc.errors.push({ rel, lineNo, rule: "sub-14px-font", snippet: `${m[0]} (< 14px floor)` });
    else acc.warns.push({ rel, lineNo, rule: "non-token-font", snippet: m[0] });
  }

  // report-only: literal radius + off-grid spacing
  RADIUS_PX.lastIndex = 0;
  while ((m = RADIUS_PX.exec(text))) acc.report.radius++;
  SPACING_PX.lastIndex = 0;
  while ((m = SPACING_PX.exec(text))) {
    const nums = (m[1].match(/-?\d+(?:\.\d+)?px/g) || []).map((v) => parseFloat(v));
    if (nums.some((n) => n > 2 && n % 4 !== 0)) acc.report.offGrid++;
  }
}

// --- run ---------------------------------------------------------------------
const files = [];
for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);

const acc = { errors: [], warns: [], report: { radius: 0, offGrid: 0 } };
let scanned = 0;
for (const abs of files) {
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  if (isAllowlisted(rel)) continue;
  scanned++;
  const state = { inBlock: false };
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => checkLine(rel, i + 1, line, state, acc));
}

const report = process.argv.includes("--report");
const group = (list) => {
  const by = {};
  for (const e of list) (by[e.rule] ||= []).push(e);
  return by;
};

console.log(`\ndesign-token guard — scanned ${scanned} files under ${SCAN_DIRS.join(", ")}\n`);

if (acc.errors.length) {
  const by = group(acc.errors);
  console.log(`✗ ${acc.errors.length} error(s):\n`);
  for (const rule of Object.keys(by)) {
    console.log(`  [${rule}] — ${by[rule].length}`);
    for (const e of by[rule]) console.log(`    ${e.rel}:${e.lineNo}  ${e.snippet}`);
  }
  console.log("");
}

if (report) {
  const by = group(acc.warns);
  console.log(`~ ${acc.warns.length} warning(s) (non-token font-size >=14px):`);
  for (const rule of Object.keys(by)) console.log(`  [${rule}] — ${by[rule].length}`);
  console.log(`~ report: ${acc.report.radius} literal border-radius, ${acc.report.offGrid} off-grid spacing declarations\n`);
}

if (acc.errors.length) {
  console.log(`FAIL — ${acc.errors.length} design-token violation(s). Fix or add a 'lint-tokens-ignore' comment with a reason.\n`);
  process.exit(1);
} else {
  console.log(`PASS — no hard violations.${report ? "" : " Run with --report for warnings + grid counts."}\n`);
  process.exit(0);
}
