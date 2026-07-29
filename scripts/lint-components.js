#!/usr/bin/env node
/*
 * lint-components.js — the shared-component drift guard (component-consolidation, P8).
 *
 * Pure Node (fs + regex). NO deps, NO install, NO network, NO OpenAI — always free.
 * Twin of lint-design-tokens.js, but a different question. That one asks "is this VALUE a
 * token?"; this one asks "is this PART built from the one shared module?".
 *
 * Why it exists: neither existing linter has any concept of a component. A hand-rolled
 * `<button class="btn">` with perfectly tokenised CSS passes lint:tokens and lint:copy
 * clean. That blind spot is how the app accumulated 223 hand-typed button strings, nine
 * copies of the initials helper, and five copies of the modal focus trap with TWO different
 * selector lists — drift nobody could see until you held two screens side by side.
 *
 * Phases 1-3 collapsed those onto one module each. Without a guard, one person typing the
 * old markup next month quietly undoes it. So:
 *
 *   ERROR (fails the build):
 *     · hand-rolled-modal   — a `modal-backdrop` element built outside ui/modal-shell.ts
 *     · hand-rolled-button  — a `class="btn …"` string outside ui/button.ts
 *     · local-initials      — a locally defined initialOf / initials helper
 *     · duplicate-logo      — a second copy of the brandmark SVG path
 *     · own-focus-trap      — a local getFocusables (the exact bug P1 fixed)
 *
 * Exemptions — the twin of DESIGN.md §6, matching lint-design-tokens.js's list, plus the
 * component-specific ones recorded in docs/plans/doing/component-consolidation/phase-3.md:
 *   whole files — stages/design.js (the live design sheet demonstrates raw markup on
 *   purpose), stages/tests/ (internal harness pages,
 *   not product), dev-badge.js, build-stamp.js, and any *.test.* file (those assert ABOUT
 *   the markup — keeping them literal is what proves the output did not change).
 *   single line — add `lint-components-ignore` in a comment on the line, with a reason.
 *
 * Known-and-deliberate leftovers are listed in KNOWN below with their reason, so the guard
 * passes today AND a NEW violation still fails. Delete an entry when its site is converted;
 * the guard errors on a KNOWN entry that no longer matches anything, so the list can't rot.
 *
 * Usage:  node scripts/lint-components.js [--json]
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["admin/src", "frontend/src"];
const EXTS = new Set([".js", ".ts"]);

const ALLOWLIST = [
  /(^|[\\/])stages[\\/]design\.js$/, // the live design sheet — shows the markup on purpose
  /(^|[\\/])stages[\\/]tests[\\/]/, // internal test-harness pages, not product
  /(^|[\\/])dev-badge\.js$/,
  /(^|[\\/])build-stamp\.js$/,
  /\.test\./, // tests assert ABOUT the markup
];

// The owner module for each rule is allowed to contain the thing it owns.
const OWNERS = {
  "hand-rolled-modal": /(^|[\\/])ui[\\/]modal-shell\.ts$/,
  "own-focus-trap": /(^|[\\/])ui[\\/]modal-shell\.ts$/,
  "hand-rolled-button": /(^|[\\/])ui[\\/]button\.ts$/,
  "local-initials": /(^|[\\/])ui[\\/]avatar\.ts$/,
  // Admin's app-nav holds the canonical copy until P7 extracts ui/logo.ts. Anchored to
  // admin/ on purpose: `ui/app-nav.js` alone would also match the customer app's fork,
  // which is one of the duplicates this rule is meant to count.
  "duplicate-logo": /^admin[\\/]src[\\/]ui[\\/]app-nav\.js$/,
};

/*
 * Sites left un-converted ON PURPOSE, each with the reason it is not a defect.
 * `max` is the count that may match: a new one anywhere still fails.
 */
const KNOWN = [
  { rule: "hand-rolled-button", file: "admin/src/stages/questioning.js", max: 4,
    why: "lane 41aadb91 held this file during P3; convert when it clears" },
  { rule: "hand-rolled-button", file: "admin/src/stages/runs.ts", max: 1,
    why: "lane 70b40d36 (skeletons) held this file during P3" },
  { rule: "hand-rolled-button", file: "admin/src/stages/start-core.js", max: 1,
    why: "lane 70b40d36 (skeletons) held this file during P3" },
  { rule: "hand-rolled-button", file: "admin/src/stages/library.js", max: 1,
    why: "lane 70b40d36 (skeletons) held this file during P3" },
  { rule: "hand-rolled-button", file: "admin/src/ui/screen-scaffold.ts", max: 1,
    why: "the shared error card — Phase 6 rebuilds this whole block" },
  { rule: "hand-rolled-button", file: "admin/src/stages/admin-runs.ts", max: 1, why: "error-card retry, Phase 6" },
  { rule: "hand-rolled-button", file: "admin/src/stages/admin-pulse.ts", max: 1, why: "error-card retry, Phase 6" },
  { rule: "hand-rolled-button", file: "admin/src/stages/admin-ratings.ts", max: 1, why: "error-card retry, Phase 6" },
  { rule: "hand-rolled-button", file: "admin/src/stages/admin-gate1.ts", max: 1, why: "error-card retry, Phase 6" },
  { rule: "hand-rolled-button", file: "admin/src/stages/admin-guest-runs.ts", max: 1, why: "error-card retry, Phase 6" },
  { rule: "hand-rolled-button", file: "admin/src/stages/admin-user-detail.ts", max: 1, why: "error-card retry, Phase 6" },
  { rule: "local-initials", file: "admin/src/ui/session-topbar.js", max: 1,
    why: "lane 4b899314 held this file during P2; one-line follow-up when it clears" },
  { rule: "duplicate-logo", file: "admin/src/ui/session-topbar.js", max: 1,
    why: "P7 extracts ui/logo.ts and collapses all four copies" },
  { rule: "duplicate-logo", file: "admin/src/ui/recap-pdf.ts", max: 1, why: "same, P7" },
  { rule: "duplicate-logo", file: "frontend/src/ui/app-nav.js", max: 1, why: "same, P7" },
];

const isAllowlisted = (rel) => ALLOWLIST.some((re) => re.test(rel));

// --- file walk (same shape as lint-design-tokens.js) --------------------------
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

// --- comment stripping, so a mention in a docblock never trips the guard ------
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
    if (line[i] === "/" && line[i + 1] === "/") break;
    out += line[i++];
  }
  return { code: out, inBlock };
}

// --- rules -------------------------------------------------------------------
// A `.btn` class string typed by hand. The off-system families (row-menu-btn, um-menu-btn,
// copy-snippet-btn, gal__screens-btn, team-card__name-btn, ds-btn-quiet) are NOT .btn
// buttons — each is its own CSS family for an icon affordance — so the word boundary
// matters: `\bbtn\b` inside the class list, not "any class containing btn".
const RULES = [
  // Only a <button> element, and only the standalone `btn` class. The word boundary has to
  // exclude hyphens: `\bbtn\b` also matches inside `row-menu-btn`, `um-menu-btn`,
  // `copy-snippet-btn` and even `js-btn-label`, which are separate CSS families, not this
  // button. Anchors (`<a class="btn">`, the Google sign-in) are out too: they are a
  // full-page navigation, and button() emits a <button>.
  { rule: "hand-rolled-button", re: /<button[^>]*class="[^"]*(?<![\w-])btn(?![\w-])/,
    fix: "use button() from ui/button.ts" },
  { rule: "hand-rolled-modal", re: /["'`]modal-backdrop["'`]/,
    fix: "use openModalShell() from ui/modal-shell.ts" },
  { rule: "own-focus-trap", re: /function getFocusables\b/,
    fix: "import getFocusables from ui/modal-shell.ts — the copies had two different selector lists" },
  { rule: "local-initials", re: /function initialOf\b|\bconst initials\s*=|function initials\s*\(/,
    fix: "use initialOf() / initialsOf() from ui/avatar.ts" },
  // The brandmark's distinctive geometry, not the whole SVG: each copy differs in its
  // width/height and its ink fill, but every one carries this rect verbatim.
  { rule: "duplicate-logo", re: /<rect x="32\.5" y="12" width="6\.5" height="24" rx="3\.25"/,
    fix: "one shared logo constant (P7)" },
];

function checkLine(rel, lineNo, rawLine, state, acc) {
  const stripped = stripComments(rawLine, state.inBlock);
  state.inBlock = stripped.inBlock;
  const text = stripped.code;
  if (!text.trim()) return;
  if (/lint-components-ignore/.test(rawLine)) return; // explicit per-line waiver

  for (const { rule, re, fix } of RULES) {
    if (OWNERS[rule] && OWNERS[rule].test(rel)) continue; // the owner module may contain it
    if (re.test(text)) acc.hits.push({ rel, lineNo, rule, fix, snippet: text.trim().slice(0, 110) });
  }
}

// --- run ---------------------------------------------------------------------
const files = [];
for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);

const acc = { hits: [] };
let scanned = 0;
for (const abs of files) {
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  if (isAllowlisted(rel)) continue;
  scanned++;
  const state = { inBlock: false };
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => checkLine(rel, i + 1, line, state, acc));
}

// Split the hits into "already known and allowed" and "new, fails the build".
const budget = KNOWN.map((k) => ({ ...k, used: 0 }));
const errors = [];
for (const hit of acc.hits) {
  const slot = budget.find((k) => k.rule === hit.rule && k.file === hit.rel && k.used < k.max);
  if (slot) slot.used++;
  else errors.push(hit);
}
// A KNOWN entry that no longer matches means the site was converted — tidy the list, so it
// can never quietly grant permission for a violation that comes back later.
const stale = budget.filter((k) => k.used < k.max);

const asJson = process.argv.includes("--json");
if (asJson) {
  console.log(JSON.stringify({
    scanned,
    errors: errors.length,
    errorDetail: errors.map((e) => `${e.rel}:${e.lineNo}  [${e.rule}]  ${e.snippet}`),
    known: acc.hits.length - errors.length,
    stale: stale.map((k) => `${k.rule} ${k.file} (${k.used}/${k.max})`),
  }));
  process.exit(errors.length || stale.length ? 1 : 0);
}

console.log(`\ncomponent guard — scanned ${scanned} files under ${SCAN_DIRS.join(", ")}\n`);

if (errors.length) {
  const by = {};
  for (const e of errors) (by[e.rule] ||= []).push(e);
  console.log(`✗ ${errors.length} hand-rolled component(s):\n`);
  for (const rule of Object.keys(by)) {
    console.log(`  [${rule}] — ${by[rule].length}   → ${by[rule][0].fix}`);
    for (const e of by[rule]) console.log(`    ${e.rel}:${e.lineNo}  ${e.snippet}`);
  }
  console.log("");
}

if (stale.length) {
  console.log(`✗ ${stale.length} stale KNOWN entr(y/ies) in lint-components.js — the site is gone, delete the entry:\n`);
  for (const k of stale) console.log(`    ${k.rule}  ${k.file}  (matched ${k.used}, expected ${k.max})`);
  console.log("");
}

const known = acc.hits.length - errors.length;
if (errors.length || stale.length) {
  console.log(
    `FAIL — ${errors.length} new violation(s), ${stale.length} stale exemption(s).\n` +
      `Use the shared module, or add 'lint-components-ignore' on the line with a reason.\n`
  );
  process.exit(1);
} else {
  console.log(`PASS — no hand-rolled components. ${known} known exemption(s) still recorded.\n`);
  process.exit(0);
}
