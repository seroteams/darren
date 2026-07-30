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
/*
 * CEILINGS: the soft counts, held so drift can only ever shrink.
 *
 * The ceiling is the trick that made the type migration possible. Setting a new rule
 * to zero on day one means a wall of failures for every session sharing this
 * checkout, so a rule starts at its MEASURED count and is lowered by whichever phase
 * earns it, in the same commit. Existing debt is frozen; new debt is blocked.
 *
 * LOWER these when a phase removes drift; never raise them. If a raise looks
 * unavoidable, that is a design decision for Carl, not a number to nudge.
 *
 *   literalRadius   a border-radius in px instead of --radius-* (DESIGN §5: 4 / 12 / full)
 *   offGridSpacing  padding/margin/gap off the 4px grid (DESIGN §3a)
 * Both measured 2026-07-26 at type-system P1 and untouched since. Radius and spacing
 * are a different request and this plan never claimed them.
 *
 * WHAT LEFT THIS LIST IN P6, and why it is now short:
 *
 * The NINE type rules P1 added are gone from here because they became ERRORS in
 * scripts/lint-design-tokens.js. An error needs no ceiling: zero is the only passing
 * value. They could be flipped because phases 2 to 5 drove them down and P6 cleared
 * the last few by hand (two --sero-radius-pill typos in start-stage.css, one
 * --color-ink-subtle in profile-badge.js, and a stated waiver on design/mobile.css's
 * iOS focus-zoom guard, which has no token form and must not get one). Measured with
 * `node scripts/lint-design-tokens.js --json` immediately BEFORE the flip, never
 * predicted:
 *   relativeFontSize 33 -> 0 · offLadderFont 28 -> 0 · unsanctionedSizeToken 451 -> 0
 *   literalFontSize 18 -> 0 · undefinedToken 3 -> 0 · clampOffRung 12 -> 0
 *   displayFaceBelow20 7 -> 0 · fontFamilyLiteral 8 -> 0 · fontShorthandResetsNumeric 0
 * That history stays here on purpose. It is the record of how the debt was paid, and
 * it is the argument for the ceiling mechanism next time someone wants to set a new
 * rule straight to zero.
 *
 * nonTokenFont is gone too, but RETIRED rather than paid: it was px-only, its own
 * comment always said P6 would retire it, and its hits were a strict subset of
 * literal-font-size's. Two ceilings for one debt could only ever disagree.
 *
 * WHAT LEFT THIS LIST IN P5b: typePropOutsideTypeLayer, the tenth and last type rule.
 * P6 landed it counted at 142 and recorded an honest raise to 164 when it completed 25
 * half-applied size/leading pairs. P5b paid both back. 164 -> 0 across 31 component
 * sheets, measured with `node scripts/lint-design-tokens.js --json` after every one of
 * the six biggest files, then flipped to an error in scripts/lint-design-tokens.js. An
 * error needs no ceiling: zero is the only passing value, and there is no number here
 * left to nudge.
 *
 * The three groups the P6 note said were "not a mechanical fix" were not fixed
 * mechanically. Weight-only rules went into one grouped section of design/type.css
 * that changes weight and nothing else, so no object was shrunk to fit a 14px role.
 * The twenty tabular-figure sites were GROUPED into .num-tabular rather than paired in
 * markup, which is the joining rule design/type.css states for every other treatment.
 * Uppercase became .type-caps; capitalize and lowercase were waived by line, because
 * they rewrite words rather than size them.
 */
const CEILINGS = {
  literalRadius: 53,
  offGridSpacing: 135,
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
};
/*
 * The eleven type-rule hints that used to sit here went with the last ceiling in P5b.
 * All ten type rules are errors now, so lint-design-tokens.js prints the offending
 * line itself and this file never gets the chance to explain one. The advice did not
 * disappear: each rule's reason is in the header of scripts/lint-design-tokens.js,
 * beside the code that raises it. Two hints, two ceilings, no dead branches.
 */

const failures = [];

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
      failures.push(
        `${key} rose to ${actual}, ceiling is ${ceiling} (+${actual - ceiling}).` +
          `\n      Design drift may only shrink. Fix the new one, or lower nothing and ask Carl.` +
          `\n      (Parallel chats share this checkout, so this can also be another session's` +
          `\n       file mid-edit. Re-run once before hunting: if it is real, it stays red.)` +
          `\n      ${HINTS[key]}`
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

console.log(
  `design guard ok — ${data.scanned} files, 0 violations; ` +
    `radii ${data.literalRadius}/${CEILINGS.literalRadius}, ` +
    `spacing ${data.offGridSpacing}/${CEILINGS.offGridSpacing}; ` +
    `all ten type rules at zero, as errors; copy clean`
);
process.exit(0);
