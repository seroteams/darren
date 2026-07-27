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
 * tokens). The 13 left are all OFF-ladder (15px, 17px, 30px, 32px) and belong to the
 * visible type pass. radius and spacing measured 2026-07-26 at P1.
 *
 * LOWER these when a phase removes drift; never raise them. If a raise looks
 * unavoidable, that is a design decision for Carl, not a number to nudge.
 *
 *   nonTokenFont    a font-size literal >=14px that should be a --type-* token
 *   literalRadius   a border-radius in px instead of --radius-* (DESIGN §5: 4 / 12 / full)
 *   offGridSpacing  padding/margin/gap off the 4px grid (DESIGN §3a)
 */
const CEILINGS = {
  nonTokenFont: 13,
  literalRadius: 53,
  offGridSpacing: 135,
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
      const extra =
        key === "nonTokenFont"
          ? `\n      Non-token font-sizes by file (yours is most likely the one that grew):\n` +
            byFile(data.nonTokenFontDetail)
              .map(([file, n]) => `        ${n.toString().padStart(3)}  ${file}`)
              .join("\n") +
            `\n      Use a --type-* token from DESIGN.md's ladder (14 / 16 / 18 / 20 / 24 / 30 / 40).`
          : key === "literalRadius"
            ? `\n      Use --radius-button (4px), --radius-card (12px) or --sero-radius-full.`
            : `\n      Keep padding/margin/gap on the 4px grid (--sero-space-*).`;
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

console.log(
  `design guard ok — ${data.scanned} files, 0 violations; ` +
    `fonts ${data.nonTokenFont}/${CEILINGS.nonTokenFont}, ` +
    `radii ${data.literalRadius}/${CEILINGS.literalRadius}, ` +
    `spacing ${data.offGridSpacing}/${CEILINGS.offGridSpacing}; copy clean`
);
process.exit(0);
