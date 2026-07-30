#!/usr/bin/env node
/*
 * test-design-guard.js — puts the design guards inside `npm test` (and therefore CI).
 *
 * Before this existed, scripts/lint-design-tokens.js and scripts/lint-copy.js were
 * manual-only: they ran when someone remembered. A change that reintroduced raw hex,
 * an em dash, or sub-14px text went green all the way to live.
 *
 * Two jobs:
 *   1. Both linters must exit 0 (hard violations already fail them).
 *   2. The SOFT counts the token guard only reports (non-token font sizes, literal
 *      border-radii, off-grid spacing) are held to a CEILING. They may fall, never rise.
 *
 * The ceiling is the trick. Setting these to zero today would mean a wall of ~250
 * failures on day one, so they start at the measured count and get lowered by whichever
 * phase earns it, in the same commit. Existing debt is frozen; new debt is blocked.
 *
 * Pure Node. No deps, no network, no OpenAI — free, like the linters it wraps.
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const SCRIPTS = __dirname;

/*
 * CEILINGS — nonTokenFont lowered 68 -> 13 by P4 (the 55 on-ladder literals became
 * tokens). Type-system P2 then took it to 7: the Meeting screen's six off-ladder
 * literals (one 32px, one 17px, four 15px) went when coach-panel.css handed all of
 * its type to the roles. P4 took it to 6 and P5 to 5, retiring the last shipped one,
 * the Pulse KPI's 30px literal, when .lp-tile__value took .type-metric. The five that
 * remain are ALL in one parked gallery prototype, admin/src/stages/tests/runner-v2.js,
 * which is the POC the Meeting screen was designed from and is exempt by Carl's call
 * (plan.md, Parked). Nothing a customer or a manager can reach is in this count any
 * more. radius and spacing measured 2026-07-26 at P1.
 *
 * LOWER these when a phase removes drift; never raise them. If a raise looks
 * unavoidable, that is a design decision for Carl, not a number to nudge.
 *
 *   nonTokenFont    a font-size literal >=14px that should be a --type-* token
 *   literalRadius   a border-radius in px instead of --radius-* (DESIGN §5: 4 / 12 / full)
 *   offGridSpacing  padding/margin/gap off the 4px grid (DESIGN §3a)
 *
 * The eight type-rule keys below join them on the same terms. Every key here
 * must also be reported as a number by lint-design-tokens.js --json, or this
 * guard fails with "did not report" rather than passing quietly.
 */
const CEILINGS = {
  nonTokenFont: 5,
  literalRadius: 53,
  offGridSpacing: 135,

  /*
   * The eight type rules, added by type-system P1 and measured on 2026-07-30
   * against the tree that P1 built. They are warnings for now: P6 turns them
   * into errors, once phases 2 to 5 have driven these numbers down.
   *
   * P2 (the Meeting screen) lowered five of them, re-measured with
   * `node scripts/lint-design-tokens.js --json` after the edit rather than
   * predicted: coach-panel.css went from 24 type hits to 0, and briefing.css's
   * question-stem rule went from 2 to 0.
   *
   * P3 (the 14px chrome stratum) lowered four more, re-measured the same way after
   * the edit and not predicted. It moved roughly 300 selectors across 40 sheets onto
   * the roles, which is why unsanctionedSizeToken falls furthest.
   *
   * P4 (the reading surfaces) lowered six more, re-measured the same way.
   *
   * P5 (headings, metrics and the markup sweep) took SEVEN of the nine to zero and
   * cleared the last shipped literal from an eighth. Every count below is what
   * `node scripts/lint-design-tokens.js --json` printed on 2026-07-31 with the
   * migration in place. None of them is a prediction.
   *
   * Read them as the size of the job, not as a list of bugs:
   *   relativeFontSize      33->8->0  all var(--x, <fallback>) today. Zero em or %:
   *                                   P0 cleared the last two. The rule is here so
   *                                   the next 0.85em cannot hide again. P5 took the
   *                                   last eight by dropping the fallbacks in the two
   *                                   runtime-injected style blocks (account-sheet.ts,
   *                                   profile-badge.js) and ux-audit-fixes.css while
   *                                   repointing them at the ladder. A fallback on a
   *                                   token that is always defined only ever hid which
   *                                   token was being read.
   *   offLadderFont           28->0   sizes off the ladder. P2 took the Meeting
   *                                   screen's six: 32px, 17px and four 15px. P3
   *                                   touched none. P4 took the last 22, and the
   *                                   sentence that used to sit here was wrong about
   *                                   what they were: NOT ONE of the 22 was a clamp.
   *                                   Sixteen were guided.css at 15px and 17px, two
   *                                   were team-card.css, one was about-stage.css,
   *                                   and three were plain literals off every rung
   *                                   (28px, 17.6px, 16.8px). Clamp sites belong to
   *                                   clampOffRung, a different key, which did not
   *                                   move. This one is at ZERO now, so the next
   *                                   off-rung size breaks the build on its own.
   *   unsanctionedSizeToken 451->0    every font-size still pointing at an old token.
   *                                   This is the migration itself, counted. It reads
   *                                   the token name through a fallback as well, so
   *                                   dropping a fallback can only ever remove a hit.
   *                                   Counting bare var() only made the two ceilings
   *                                   trade against each other: following the guard's
   *                                   own advice moved 33 sites into this key and
   *                                   broke a build that had fixed something. At zero
   *                                   because P5 deleted the tokens themselves, so
   *                                   there is no longer an older token to point at.
   *   literalFontSize         18->1   a size written as a literal in any unit rather
   *                                   than a token. Without it every counter here
   *                                   could be zeroed by swapping tokens for rem
   *                                   literals on a rung, which reads as a finished
   *                                   migration and is the same debt in a new unit.
   *                                   P5 took three of the four: add-person-modal's
   *                                   20px and admin-pulse's 30px joined roles, and
   *                                   .input's clamp became a flat 24px rung. The one
   *                                   left is mobile.css's max(1rem, 1em), which is
   *                                   the iOS focus-zoom guard, not drift: it lifts
   *                                   small controls to 16 and leaves big ones alone,
   *                                   so a flat token there would SHRINK the front
   *                                   door's input. P6 waives it.
   *   undefinedToken               3  an undefined reference. Two are dropped at
   *                                   render (--sero-radius-pill in start-stage.css);
   *                                   the third, --color-ink-subtle in profile-badge.js,
   *                                   carries a working fallback and paints normally.
   *   clampOffRung         12->10->0  the fluid heading tokens, endpoints off the rungs.
   *                                   P2 retired two --type-h2 sites, the coach split's
   *                                   phone override and briefing.css's stem. Nine of
   *                                   the ten P5 inherited were headings on the three
   *                                   clamp tokens; the tenth was NOT a heading, it was
   *                                   .input's own clamp(1.25rem, 3.5vw, 1.75rem) in
   *                                   buttons-inputs.css. Zero now, and with the tokens
   *                                   deleted there is no fluid font-size left in
   *                                   either app.
   *   displayFaceBelow20    7->4->0   Bricolage under 20px, banned by DESIGN.md T6.
   *                                   P4 took three of the seven by moving the object
   *                                   onto a base-family role rather than leaving the
   *                                   face where it was: guided.css's 14px monogram
   *                                   (.type-label-strong) and team-card.css's 15px
   *                                   avatar and 17px name (.type-heading-sm). P5 took
   *                                   the last four the same way, all at 18px:
   *                                   design-stage, test-gallery, guided and the
   *                                   session top bar's copy of the Sero wordmark.
   *   fontFamilyLiteral      8->1->0  family stacks written out instead of tokenised.
   *                                   P3 took seven of the eight: six copies of the
   *                                   run-log mono stack and guide.css's near-copy.
   *                                   The last was base.css's body stack, which a
   *                                   comment required to stay byte-identical to
   *                                   --type-family-base. P5 pointed it at the token
   *                                   instead, so the two cannot drift.
   *   fontShorthandResetsNumeric   0  none today, and it starts locked at zero.
   */
  relativeFontSize: 0,
  offLadderFont: 0,
  unsanctionedSizeToken: 0,
  literalFontSize: 1,
  undefinedToken: 3,
  clampOffRung: 0,
  displayFaceBelow20: 0,
  fontFamilyLiteral: 0,
  fontShorthandResetsNumeric: 0,
};

/*
 * What to tell the reader when a ceiling breaks. Before this was a map it was a
 * two-branch ternary whose fallback was the spacing message, so any new key
 * breached with "keep padding on the 4px grid" and sent the reader to the wrong
 * file entirely.
 */
const HINTS = {
  literalRadius: `Use --radius-button (4px), --radius-card (12px) or --sero-radius-full.`,
  offGridSpacing: `Keep padding/margin/gap on the 4px grid (--sero-space-*).`,
  relativeFontSize: `A font-size must resolve to px. Drop the var() fallback, and never size in em or %.`,
  offLadderFont: `Use a rung: 14 / 16 / 18 / 20 / 24 / 30 / 36 (--type-size-* in tokens.css).`,
  unsanctionedSizeToken: `Point font-size at a --type-size-* token, not an older type token.`,
  undefinedToken: `That var() has no definition anywhere. Without a fallback the declaration is dropped at render.`,
  literalFontSize: `Size text with a --type-size-* token, not a literal, whatever the unit.`,
  clampOffRung: `A fluid font-size needs both clamp endpoints on the ladder.`,
  displayFaceBelow20: `Bricolage is legal at 20px and up only (DESIGN.md T6). Use --type-family-base below that.`,
  fontFamilyLiteral: `Use --type-family-base / -display / -mono instead of writing the stack out.`,
  fontShorthandResetsNumeric: `The font: shorthand resets font-variant-numeric. Declare tabular figures AFTER it.`,
};

// CEILINGS key -> the rule name that appears in typeWarnDetail. The twin of
// TYPE_RULES in scripts/lint-design-tokens.js: change one, change the other.
const TYPE_RULE_BY_KEY = {
  relativeFontSize: "relative-font-size",
  offLadderFont: "off-ladder-font",
  unsanctionedSizeToken: "unsanctioned-size-token",
  undefinedToken: "undefined-token",
  clampOffRung: "clamp-off-rung",
  displayFaceBelow20: "display-face-below-20",
  fontFamilyLiteral: "font-family-literal",
  fontShorthandResetsNumeric: "font-shorthand-resets-numeric",
  literalFontSize: "literal-font-size",
};

const failures = [];

// "admin/src/foo.css:12  font-size:15px" -> [[file, count], …], biggest first.
const byFile = (detail) => {
  const counts = {};
  for (const line of detail) {
    const file = line.split(":")[0];
    counts[file] = (counts[file] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

// --- 1. the token guard, in machine-readable mode ----------------------------
const tokens = spawnSync(
  process.execPath,
  [path.join(SCRIPTS, "lint-design-tokens.js"), "--json"],
  { encoding: "utf8" }
);

let data = null;
try {
  data = JSON.parse((tokens.stdout || "").trim().split("\n").pop());
} catch {
  failures.push(
    `lint-design-tokens.js --json did not return parseable JSON.\n` +
      `      stdout: ${(tokens.stdout || "").slice(0, 400)}\n` +
      `      stderr: ${(tokens.stderr || "").slice(0, 400)}`
  );
}

if (data) {
  if (data.errors > 0) {
    failures.push(
      `${data.errors} hard design-token violation(s):\n` +
        data.errorDetail.map((d) => `        ${d}`).join("\n") +
        `\n      Fix them, or add a 'lint-tokens-ignore' comment on the line with a reason.`
    );
  }

  for (const [key, ceiling] of Object.entries(CEILINGS)) {
    const actual = data[key];
    if (typeof actual !== "number") {
      failures.push(`lint-design-tokens.js --json did not report "${key}".`);
      continue;
    }
    if (actual > ceiling) {
      // The type rules ship their own per-line detail, so name the offending
      // lines rather than the files: there are eight rules and "which file" is
      // not enough to tell which of them grew.
      const rule = TYPE_RULE_BY_KEY[key];
      const extra = rule
        ? `\n      ${rule} hits:\n` +
          (data.typeWarnDetail || [])
            .filter((d) => d.includes(`[${rule}]`))
            .map((d) => `        ${d}`)
            .join("\n") +
          `\n      ${HINTS[key]}`
        : key === "nonTokenFont"
          ? `\n      Non-token font-sizes by file (yours is most likely the one that grew):\n` +
            byFile(data.nonTokenFontDetail)
              .map(([file, n]) => `        ${n.toString().padStart(3)}  ${file}`)
              .join("\n") +
            `\n      Use a --type-size-* token from the ladder (14 / 16 / 18 / 20 / 24 / 30 / 36).`
          : `\n      ${HINTS[key]}`;
      failures.push(
        `${key} rose to ${actual}, ceiling is ${ceiling} (+${actual - ceiling}).` +
          `\n      Design drift may only shrink. Fix the new one, or lower nothing and ask Carl.` +
          `\n      (Parallel chats share this checkout, so this can also be another session's` +
          `\n       file mid-edit. Re-run once before hunting: if it is real, it stays red.)` +
          extra
      );
    }
  }
}

// --- 2. the copy guard (no em dashes in user-facing copy) --------------------
const copy = spawnSync(process.execPath, [path.join(SCRIPTS, "lint-copy.js")], {
  encoding: "utf8",
});
if (copy.status !== 0) {
  failures.push(
    `lint-copy.js failed (em dash in user-facing copy):\n` +
      `${(copy.stdout || "").trimEnd().replace(/^/gm, "      ")}`
  );
}

// --- report ------------------------------------------------------------------
if (failures.length) {
  console.error("design guard FAILED\n");
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

const typeTotal = Object.keys(TYPE_RULE_BY_KEY).reduce((n, k) => n + data[k], 0);
const typeCeiling = Object.keys(TYPE_RULE_BY_KEY).reduce((n, k) => n + CEILINGS[k], 0);

console.log(
  `design guard ok — ${data.scanned} files, 0 violations; ` +
    `fonts ${data.nonTokenFont}/${CEILINGS.nonTokenFont}, ` +
    `radii ${data.literalRadius}/${CEILINGS.literalRadius}, ` +
    `spacing ${data.offGridSpacing}/${CEILINGS.offGridSpacing}, ` +
    `type ${typeTotal}/${typeCeiling} across ${Object.keys(TYPE_RULE_BY_KEY).length} rules; copy clean`
);
process.exit(0);
