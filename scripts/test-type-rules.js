#!/usr/bin/env node
// Offline unit test for the type rules in scripts/lint-design-tokens.js
// (type-system plan, Phase 1). Feeds hand-written CSS fixtures straight at the
// rule functions and asserts each new rule fires where it should and stays
// quiet where it should not. No API calls, no repo walk: free, runs in `npm test`.
//
// Why it exists: a lint rule that is silently inert looks exactly like a clean
// codebase. The px-only font-size check was inert against fractions for months,
// which is how .um-trend shipped at 0.85em (11.9px) and .bullet__mark at 0.65em
// (10.4px). This file is the proof the new rules are not no-ops.
//
// Requiring lint-design-tokens.js is itself part of the test. Before Phase 1 the
// module walked the repo and called process.exit at import time, the same hazard
// scripts/gate.js still carries. If that regressed, this file would die here.

const { readFileSync } = require("fs");
const { join } = require("path");

const {
  newAcc,
  lintText,
  resolveFontSize,
  isTypeExempt,
  RUNGS,
  SANCTIONED_SIZE_TOKENS,
  TYPE_RULES,
  TYPE_ERRORS,
} = require("./lint-design-tokens.js");

let failed = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? `  -  ${detail}` : ""}`);
  }
}

// The token table the fixtures resolve against. Small on purpose: the real one
// is read from tokens.css at scan time, and a test that re-read the real file
// would fail every time a token moved rather than when a rule broke.
const TOKENS = new Map([
  ["--type-size-sm", "0.875rem"],
  ["--type-size-base", "1rem"],
  ["--type-size-lg", "1.125rem"],
  ["--type-size-xl", "1.25rem"],
  ["--type-size-2xl", "1.5rem"],
  ["--type-size-3xl", "1.875rem"],
  ["--type-size-4xl", "2.25rem"],
  ["--type-leading-sm", "1.25rem"],
  ["--type-leading-base", "1.5rem"],
  ["--type-leading-lg", "1.75rem"],
  ["--type-leading-xl", "1.75rem"],
  ["--type-leading-2xl", "2rem"],
  ["--type-leading-3xl", "2.25rem"],
  ["--type-leading-4xl", "2.5rem"],
  ["--type-body-sm", "14px"],
  ["--type-body-md", "15px"],
  ["--type-h2", "clamp(1.75rem, 3.5vw, 2.25rem)"],
  ["--type-family-display", '"Bricolage Grotesque Variable", "Inter Variable", sans-serif'],
  ["--type-family-base", '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif'],
  ["--type-family-mono", "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"],
  ["--type-weight-regular", "400"],
  ["--type-weight-medium", "500"],
  ["--type-weight-semibold", "600"],
  // The roles top out at semibold, but the real type.css reads bold in one place:
  // the Sero wordmark and monogram, which are the logotype rather than headings
  // (type-system P5). Group 13 lints the real file against this map, so a token it
  // reads and this map has never heard of reads as an undefined-token.
  ["--type-weight-bold", "700"],
  ["--type-tracking-tighter", "-0.02em"],
  ["--type-tracking-tight", "-0.01em"],
  ["--type-tracking-wide", "0.02em"],
  ["--type-tracking-caps-lg", "0.08em"],
  ["--measure", "38rem"],
  ["--measure-lede", "44rem"],
  ["--measure-narrow", "46ch"],
  // The reading measure the two body roles took in P4. It has to be in this fixture
  // for the same reason the roles are: group 13 lints the REAL type.css against this
  // map, so a token the real file uses and this map has never heard of reads as an
  // undefined-token rather than as a token the fixture is missing.
  ["--measure-read", "60ch"],
  ["--color-ink", "#101828"],
  ["--type-role-metric", "600 1.875rem/2.25rem var(--type-family-display)"],
  ["--type-role-body", "400 1rem/1.5rem var(--type-family-base)"],
]);

const CSS = "admin/src/styles/design/example.css";
const GALLERY = "admin/src/stages/tests/welcome-lean.js";

const lint = (text, rel = CSS) => lintText(text, rel, newAcc(), TOKENS);
const typeHits = (acc, rule) => acc.typeWarns.filter((w) => w.rule === rule).length;
const errHits = (acc, rule) => acc.errors.filter((e) => e.rule === rule).length;

console.log("\n--- type rules unit ---");

// --- 1. the module is importable without running -----------------------------
{
  check("lintText is exported", typeof lintText === "function");
  check("resolveFontSize is exported", typeof resolveFontSize === "function");
  check("isTypeExempt is exported", typeof isTypeExempt === "function");
  const acc = newAcc();
  check(
    "newAcc carries the three buckets",
    Array.isArray(acc.errors) &&
      Array.isArray(acc.typeWarns) &&
      typeof acc.report.radius === "number" &&
      typeof acc.report.offGrid === "number",
    JSON.stringify(acc)
  );
  check(
    "the ladder is the seven Tailwind rungs, no 12px step",
    RUNGS.join(",") === "14,16,18,20,24,30,36",
    RUNGS.join(",")
  );
  check(
    "exactly seven size tokens are sanctioned",
    SANCTIONED_SIZE_TOKENS.size === 7 && SANCTIONED_SIZE_TOKENS.has("--type-size-2xl"),
    [...SANCTIONED_SIZE_TOKENS].join(",")
  );
}

// --- 2. the size resolver ----------------------------------------------------
{
  const px = (v) => resolveFontSize(v, TOKENS).px;
  const bad = (v) => resolveFontSize(v, TOKENS).unresolvable;

  check("a px literal resolves", px("16px") === 16, String(px("16px")));
  check("rem resolves at 16 per rem", px("0.875rem") === 14, String(px("0.875rem")));
  check("a var() chases the token", px("var(--type-size-2xl)") === 24, String(px("var(--type-size-2xl)")));
  check("a nested clamp token resolves to its floor", px("var(--type-h2)") === 28, String(px("var(--type-h2)")));
  check("em is unresolvable", bad("0.85em") === "relative-unit", String(bad("0.85em")));
  check("percent is unresolvable", bad("85%") === "relative-unit", String(bad("85%")));
  check("calc is unresolvable", bad("calc(1rem - 4px)") === "calc", String(bad("calc(1rem - 4px)")));
  check("an unknown token is named as such", bad("var(--nope)") === "unknown-token", String(bad("var(--nope)")));
  check(
    "a var fallback is refused",
    bad("var(--type-size-base, 14px)") === "var-fallback",
    String(bad("var(--type-size-base, 14px)"))
  );
  check("inherit is skipped, not failed", resolveFontSize("inherit", TOKENS).skip === true);
  // mobile.css:298 is font-size: max(1rem, 1em). The 1em cannot be resolved, but
  // max() returns the largest, so 1rem pins the floor at 16px and the declaration
  // is provably safe. A naive fail-on-any-unresolvable-argument turns a correct
  // iOS zoom guard into a red build.
  check("max() is pinned by its resolvable argument", px("max(1rem, 1em)") === 16, String(px("max(1rem, 1em)")));
  check("min() takes its smallest argument", px("min(1rem, 0.75rem)") === 12, String(px("min(1rem, 0.75rem)")));
  check(
    "clamp reports both endpoints",
    JSON.stringify(resolveFontSize("clamp(1.25rem, 3vw, 1.5rem)", TOKENS).clamp) === "[20,24]",
    JSON.stringify(resolveFontSize("clamp(1.25rem, 3vw, 1.5rem)", TOKENS).clamp)
  );
}

// --- 3. relative-font-size ---------------------------------------------------
{
  check("em font-size is flagged", typeHits(lint(".a { font-size: 0.85em; }"), "relative-font-size") === 1);
  check("percent font-size is flagged", typeHits(lint(".a { font-size: 85%; }"), "relative-font-size") === 1);
  check("rem font-size is not flagged", typeHits(lint(".a { font-size: 1rem; }"), "relative-font-size") === 0);
  check(
    "an unknown token is not double-reported as relative",
    typeHits(lint(".a { font-size: var(--nope); }"), "relative-font-size") === 0
  );
}

// --- 4. off-ladder-font ------------------------------------------------------
{
  check("15px through a token is off-ladder", typeHits(lint(".a { font-size: var(--type-body-md); }"), "off-ladder-font") === 1);
  check("28px is off-ladder", typeHits(lint(".a { font-size: 1.75rem; }"), "off-ladder-font") === 1);
  check("a rung is not flagged", typeHits(lint(".a { font-size: var(--type-size-base); }"), "off-ladder-font") === 0);
  check("36px is the top rung", typeHits(lint(".a { font-size: 36px; }"), "off-ladder-font") === 0);
  check(
    "a clamp is judged by clamp-off-rung, not off-ladder-font",
    typeHits(lint(".a { font-size: var(--type-h2); }"), "off-ladder-font") === 0
  );
}

// --- 5. unsanctioned-size-token ---------------------------------------------
{
  check(
    "an old size token is flagged",
    typeHits(lint(".a { font-size: var(--type-body-sm); }"), "unsanctioned-size-token") === 1
  );
  check(
    "a --type-size-* token is clean",
    typeHits(lint(".a { font-size: var(--type-size-sm); }"), "unsanctioned-size-token") === 0
  );
  check(
    "a literal is not a token complaint",
    typeHits(lint(".a { font-size: 16px; }"), "unsanctioned-size-token") === 0
  );
}

// --- 6. undefined-token ------------------------------------------------------
{
  check("a var() with no definition is flagged", typeHits(lint(".a { color: var(--nope); }"), "undefined-token") === 1);
  check("a defined var() is clean", typeHits(lint(".a { color: var(--color-ink); }"), "undefined-token") === 0);
  check(
    "every missing reference is counted, not just the first",
    typeHits(lint(".a { color: var(--nope); background: var(--nope); }"), "undefined-token") === 2
  );
}

// --- 7. clamp-off-rung -------------------------------------------------------
{
  check(
    "a clamp with an off-rung floor is flagged",
    typeHits(lint(".a { font-size: var(--type-h2); }"), "clamp-off-rung") === 1
  );
  check(
    "a clamp between two rungs is clean",
    typeHits(lint(".a { font-size: clamp(1.25rem, 3vw, 1.5rem); }"), "clamp-off-rung") === 0
  );
}

// --- 8. display-face-below-20 ------------------------------------------------
// DESIGN.md T6: Bricolage is only legal at 20px and up. Below that it is a defect.
{
  check(
    "the display face at 18px is flagged",
    typeHits(
      lint(".a { font-family: var(--type-family-display); font-size: var(--type-size-lg); }"),
      "display-face-below-20"
    ) === 1
  );
  check(
    "the display face at 20px is legal",
    typeHits(
      lint(".a { font-family: var(--type-family-display); font-size: var(--type-size-xl); }"),
      "display-face-below-20"
    ) === 0
  );
  check(
    "the base face at 16px is not a display breach",
    typeHits(
      lint(".a { font-family: var(--type-family-base); font-size: var(--type-size-base); }"),
      "display-face-below-20"
    ) === 0
  );
  check(
    "a literal Bricolage stack below 20px is caught too",
    typeHits(lint('.a { font-family: "Bricolage Grotesque Variable"; font-size: 18px; }'), "display-face-below-20") === 1
  );
  check(
    "a display face with no size in the block is left alone",
    typeHits(lint(".a { font-family: var(--type-family-display); }"), "display-face-below-20") === 0
  );
}

// --- 9. font-family-literal --------------------------------------------------
{
  check(
    "a literal family stack is flagged",
    typeHits(lint('.a { font-family: "Inter Variable", sans-serif; }'), "font-family-literal") === 1
  );
  check(
    "a tokenised family is clean",
    typeHits(lint(".a { font-family: var(--type-family-base); }"), "font-family-literal") === 0
  );
  check("font-family: inherit is a reset, not drift", typeHits(lint(".a { font-family: inherit; }"), "font-family-literal") === 0);
}

// --- 10. font-shorthand-resets-numeric ---------------------------------------
// The CSS font: shorthand resets font-variant-numeric (and font-feature-settings)
// to their initial values. So tabular figures survive only when they are declared
// AFTER the shorthand. The broken order is the one worth catching.
{
  check(
    "tabular figures wiped by a later shorthand are flagged",
    typeHits(
      lint(".a { font-variant-numeric: tabular-nums; font: var(--type-role-metric); }"),
      "font-shorthand-resets-numeric"
    ) === 1
  );
  check(
    "the safe order is clean",
    typeHits(
      lint(".a { font: var(--type-role-metric); font-variant-numeric: tabular-nums; }"),
      "font-shorthand-resets-numeric"
    ) === 0
  );
  check(
    "a bare font: inherit reset is clean",
    typeHits(lint(".a { font: inherit; }"), "font-shorthand-resets-numeric") === 0
  );
  check(
    "the two must share a block to pair up",
    typeHits(
      lint(".a { font-variant-numeric: tabular-nums; }\n.b { font: var(--type-role-metric); }"),
      "font-shorthand-resets-numeric"
    ) === 0
  );
}

// --- 11. TYPE_EXEMPT: the parked gallery prototypes --------------------------
// admin/src/stages/tests/*.js are the five parked gallery screens (plan.md
// "Parked"). No customer sees them, so the structural type rules skip them. The
// accessibility floor and the colour rules still apply: parked is not exempt.
{
  check("the gallery path is exempt", isTypeExempt(GALLERY) === true);
  check("a normal admin path is not", isTypeExempt(CSS) === false);
  check(
    "structural rules skip the gallery",
    lint(".a { font-size: 0.85em; font-family: 'Inter'; }", GALLERY).typeWarns.length === 0
  );
  check(
    "the 14px floor still bites in the gallery",
    errHits(lint(".a { font-size: 12px; }", GALLERY), "sub-14px-font") === 1
  );
  check(
    "raw hex still bites in the gallery",
    errHits(lint(".a { color: #fff; }", GALLERY), "raw-hex") === 1
  );
  check(
    "the same fixture outside the gallery is flagged",
    lint(".a { font-size: 0.85em; font-family: 'Inter'; }", CSS).typeWarns.length > 0
  );
}

// --- 11b. type-property-outside-type-layer: the two-file law -----------------
/*
 * The headline rule of type-system P6, and the one that replaced an invariant
 * that could never be measured. The plan used to say `font-size` must appear in
 * "exactly two files" and be checked with a grep. It cannot: tokens.css contains
 * the string zero times (it defines --type-size-* and never uses the property),
 * and about seventeen files match the string legitimately for ever after, five of
 * them test files asserting ON it and two where it only appears in a comment.
 *
 * This rule reads DECLARATIONS instead of text, so a comment, a test assertion
 * and a JS object key cannot trip it, and it names the exact line when it does.
 */
{
  const TYPE_LAYER = "admin/src/styles/design/type.css";
  const TOKEN_LAYER = "admin/src/styles/design/tokens.css";
  const outside = (acc) => typeHits(acc, "type-property-outside-type-layer");

  check("a font-size in a component sheet is a hit",
    outside(lint(".a { font-size: var(--type-size-sm); }")) === 1);
  check("so are the other seven properties",
    outside(lint(`.a {
      line-height: 1.4; font-weight: 600; letter-spacing: 0.02em;
      font-family: var(--type-family-base); text-transform: uppercase;
      font-variant-numeric: tabular-nums; font: 400 16px/24px sans-serif;
    }`)) === 7);
  check("a non-type property is not a hit",
    outside(lint(".a { color: var(--color-ink); padding: 4px; }")) === 0);

  // The two sanctioned files are the whole point of the rule.
  check("type.css may declare type", outside(lint(".type-body { font-size: 16px; }", TYPE_LAYER)) === 0);
  check("tokens.css may declare type", outside(lint("body { font-size: 16px; }", TOKEN_LAYER)) === 0);
  check("a look-alike path elsewhere is NOT sanctioned",
    outside(lint(".a { font-size: 16px; }", "admin/src/stages/tests-type.css")) === 1);

  // A CSS-wide keyword sets no type VALUE: it hands the property back to the
  // cascade. `font: inherit` on a <button> is how a control rejoins the document
  // face at all, so counting it would make the rule unsatisfiable for controls.
  check("font: inherit introduces no type", outside(lint(".a { font: inherit; }")) === 0);
  check("font-family: inherit introduces no type", outside(lint(".a { font-family: inherit; }")) === 0);
  check("unset/revert introduce no type",
    outside(lint(".a { font-weight: unset; line-height: revert; }")) === 0);

  check("the parked gallery is exempt here too",
    outside(lint(".a { font-size: 16px; }", GALLERY)) === 0);
  check("a per-line waiver still works",
    outside(lint(".a { font-size: 16px; } /* lint-tokens-ignore reason */")) === 0);

  // It has to see a runtime-injected <style> block in a .ts file, because those
  // load LAST and beat every stylesheet, so they are the worst place to hide type.
  check("a template-literal style block is read the same way",
    outside(lint("const s = `\n.acct-hint { font-size: 14px; }\n`;", "admin/src/ui/account-sheet.ts")) === 1);
}

// --- 11c. severity: which rules FAIL the build (P6) --------------------------
/*
 * P6 flipped nine rules from warning to error. The flip is a REPORT-TIME decision,
 * not an accumulator one: every rule still lands in typeWarns so the per-rule counts
 * and the detail lines keep working, and TYPE_ERRORS decides which of those counts
 * fails the run. Doing it the other way round would have moved nine rules out of
 * typeWarns and silently emptied the counters this file has always asserted on.
 *
 * Sequencing mattered more than the mechanism: all nine measured ZERO before they
 * were flipped, so the flip could not red the build for the parallel sessions
 * sharing this checkout.
 */
{
  const errorRules = [
    "relative-font-size",
    "off-ladder-font",
    "unsanctioned-size-token",
    "undefined-token",
    "clamp-off-rung",
    "display-face-below-20",
    "font-family-literal",
    "font-shorthand-resets-numeric",
    "literal-font-size",
    // P5b. The tenth and last. It was counted rather than flipped for two phases
    // because it still carried 164 declarations across 31 component sheets; this
    // line moved here in the same commit that measured it at zero.
    "type-property-outside-type-layer",
  ];
  for (const r of errorRules) {
    check(`${r} fails the build`, TYPE_ERRORS.has(r), `${r} is not in TYPE_ERRORS`);
  }
  check(
    "every type rule is an error, so none of them needs a ceiling",
    TYPE_RULES.every(([name]) => TYPE_ERRORS.has(name)),
    "scripts/test-design-guard.js only holds literalRadius and offGridSpacing now"
  );
  check(
    "every error rule is a real rule name",
    errorRules.every((r) => TYPE_RULES.some(([name]) => name === r)),
    JSON.stringify(TYPE_RULES.map(([n]) => n))
  );
}

// --- 12. the rules that were already there are untouched ---------------------
{
  check("sub-14px is still a hard error", errHits(lint(".a { font-size: 12px; }"), "sub-14px-font") === 1);
  // The px-only non-token-font warning was RETIRED in P6: every hit it had was also
  // a literal-font-size hit, so it reported one debt under two names. Its unit-aware
  // replacement catches the same fixture and is now an error rather than a warning.
  check("the retired non-token-font rule is gone", !TYPE_RULES.some(([n]) => n === "non-token-font"));
  check("its unit-aware replacement catches the same fixture",
    typeHits(lint(".a { font-size: 30px; }"), "literal-font-size") === 1);
  check("and that replacement fails the build", TYPE_ERRORS.has("literal-font-size"));
  check("raw hex is still an error", errHits(lint(".a { color: #ff0000; }"), "raw-hex") === 1);
  check("rgb() is still an error", errHits(lint(".a { color: rgb(1, 2, 3); }"), "rgb-literal") === 1);
  check(
    "a var fallback literal is still an error",
    errHits(lint(".a { color: var(--color-ink, #fff); }"), "hex-fallback") === 1
  );
  // IS_TOKEN_DEF is line-anchored, so the definition has to own its line. That is
  // how tokens.css is written and how the exemption has always behaved.
  check(
    "a token definition line may hold raw values",
    errHits(lint(":root {\n  --x: #ff0000;\n}"), "raw-hex") === 0
  );
  const waived = lint(".a { font-size: 0.85em; } /* lint-tokens-ignore reason */");
  check("lint-tokens-ignore waives the whole line", waived.typeWarns.length === 0);
  check(
    "the report counters still count",
    lint(".a { border-radius: 6px; padding: 7px; }").report.radius === 1
  );
}

// --- 13. the REAL type.css must land clean -----------------------------------
/*
 * This reads admin/src/styles/design/type.css off disk rather than a copy of it.
 * The first version of this group asserted against a hand-written excerpt of six
 * of the fourteen roles, which proved only that the excerpt was clean: drift in
 * the actual role layer could not turn it red. A test that names a file it never
 * opens is the same failure mode as a lint rule that cannot see a fraction.
 *
 * If this goes red, the type layer itself has drifted off the ladder. Cheaper to
 * catch here than by reading a ceiling that quietly rose.
 */
{
  const realPath = join(__dirname, "..", "admin", "src", "styles", "design", "type.css");
  const realCss = readFileSync(realPath, "utf8");
  const real = lint(realCss, "admin/src/styles/design/type.css");
  check("the real type.css raises no type warning", real.typeWarns.length === 0, JSON.stringify(real.typeWarns));
  check("the real type.css raises no error", real.errors.length === 0, JSON.stringify(real.errors));

  // All fourteen roles are present, so a deletion cannot pass by being absent.
  const ROLES = [
    "display", "heading-xl", "heading-lg", "heading-md", "heading-sm", "heading-xs",
    "body-lg", "body", "body-sm", "label", "label-strong", "overline", "code", "metric",
  ];
  const missing = ROLES.filter((r) => !new RegExp(`\\.type-${r}\\s*(,|\\{)`).test(realCss));
  check("all fourteen roles are defined in the real file", missing.length === 0, `missing: ${missing.join(", ")}`);
}

// --- 13b. the same shape, inline, as a readable reference --------------------
// Kept because it documents what a clean role looks like at a glance, which the
// file read above cannot do when it fails.
{
  const typeCss = `
.type-display {
  font-family: var(--type-family-display);
  font-size: var(--type-size-4xl);
  line-height: var(--type-leading-4xl);
  font-weight: var(--type-weight-semibold);
  letter-spacing: var(--type-tracking-tighter);
  text-wrap: balance;
}
.type-heading-md {
  font-family: var(--type-family-display);
  font-size: var(--type-size-xl);
  line-height: var(--type-leading-xl);
  font-weight: var(--type-weight-semibold);
  text-wrap: balance;
}
.type-heading-xs {
  font-family: var(--type-family-base);
  font-size: var(--type-size-base);
  line-height: var(--type-leading-base);
  font-weight: var(--type-weight-semibold);
}
.type-body {
  font-family: var(--type-family-base);
  font-size: var(--type-size-base);
  line-height: var(--type-leading-base);
  font-weight: var(--type-weight-regular);
  max-width: var(--measure);
  text-wrap: pretty;
}
.type-code {
  font-family: var(--type-family-mono);
  font-size: var(--type-size-sm);
  line-height: var(--type-leading-sm);
  font-weight: var(--type-weight-regular);
}
.type-metric {
  font-family: var(--type-family-display);
  font-size: var(--type-size-3xl);
  line-height: var(--type-leading-3xl);
  font-weight: var(--type-weight-semibold);
  letter-spacing: var(--type-tracking-tight);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 639.98px) {
  .type-heading-xl {
    font-size: var(--type-size-2xl);
    line-height: var(--type-leading-2xl);
  }
}
`;
  const acc = lint(typeCss, "admin/src/styles/design/type.css");
  check("the reference role shape raises no type warning", acc.typeWarns.length === 0, JSON.stringify(acc.typeWarns));
  check("the reference role shape raises no error", acc.errors.length === 0, JSON.stringify(acc.errors));
}

// --- 14. the composites are safe in the shorthand ----------------------------
/*
 * The whole point of --type-role-* is `font: var(--type-role-x)`. Every size rule
 * in the linter used to match the literal property `font-size`, so that syntax
 * was invisible: a 12px shorthand cleared the 14px floor, the ladder and T6 at
 * once. These assertions are the proof that hole is shut.
 */
{
  const tokens = new Map([
    ["--type-family-display", '"Bricolage Grotesque Variable", sans-serif'],
    ["--type-family-base", '"Inter Variable", sans-serif'],
    ["--type-size-base", "1rem"],
    ["--type-leading-base", "1.5rem"],
    ["--type-weight-regular", "400"],
    ["--type-role-body", "var(--type-weight-regular) var(--type-size-base)/var(--type-leading-base) var(--type-family-base)"],
  ]);
  const at = (css) => lintText(css, "admin/src/styles/x.css", newAcc(), tokens);

  /*
   * P6 split this assertion in two, because the two things it used to check
   * together stopped being the same thing. A composite carries the ladder
   * correctly, so it raises no ladder rule and no error. But it is still a type
   * declaration in a component sheet, so the two-file law counts it, and it
   * SHOULD: `font: var(--type-role-body)` in a component sheet is a role applied
   * outside the role layer, which is precisely the shape the composites' own
   * header warns is a partial (no tracking, no measure, no phone breakpoint).
   * Asserting "zero warnings of any kind" would have forced the new rule to be
   * blind to the composites, which are the easiest way to smuggle a role.
   */
  const composite = at(".a { font: var(--type-role-body); }");
  const ladderRules = composite.typeWarns.filter((w) => w.rule !== "type-property-outside-type-layer");
  check("a role composite in the shorthand raises no LADDER warning and no error",
    ladderRules.length === 0 && composite.errors.length === 0,
    JSON.stringify({ ladder: ladderRules, err: composite.errors }));
  check("but the two-file law still sees it",
    composite.typeWarns.filter((w) => w.rule === "type-property-outside-type-layer").length === 1,
    JSON.stringify(composite.typeWarns));

  const tiny = at(".a { font: 400 12px/16px var(--type-family-base); }");
  check("a sub-14px shorthand is an ERROR, not a warning",
    tiny.errors.some((e) => e.rule === "sub-14px-font"), JSON.stringify(tiny.errors));

  const tinyRem = at(".a { font: 400 0.6rem/1 var(--type-family-base); }");
  check("a sub-14px shorthand in rem is an ERROR too",
    tinyRem.errors.some((e) => e.rule === "sub-14px-font"), JSON.stringify(tinyRem.errors));

  const bricolage = at(".a { font: 600 12px/1 var(--type-family-display); }");
  check("Bricolage below 20px is caught inside a shorthand",
    bricolage.typeWarns.some((w) => w.rule === "display-face-below-20"), JSON.stringify(bricolage.typeWarns));

  const weightFirst = at(".a { font: var(--type-weight-regular) var(--type-size-base)/var(--type-leading-base) var(--type-family-base); }");
  check("the weight is not mistaken for the size", weightFirst.errors.length === 0, JSON.stringify(weightFirst.errors));

  const inherit = at(".a { font: inherit; }");
  check("font: inherit introduces nothing", inherit.typeWarns.length === 0 && inherit.errors.length === 0,
    JSON.stringify({ type: inherit.typeWarns, err: inherit.errors }));
}

// --- 15. dropping a var() fallback can only ever remove hits -----------------
/*
 * The two ceilings used to trade against each other: a `font-size: var(--old, 14px)`
 * counted only as relative-font-size, so doing what the guard's own hint said and
 * dropping the fallback moved it into unsanctioned-size-token and broke a build
 * that had just fixed something. The token name is now read through the fallback.
 */
{
  const tokens = new Map([["--type-body-sm", "14px"]]);
  const at = (css) => lintText(css, "admin/src/styles/x.css", newAcc(), tokens);
  const rules = (acc) => acc.typeWarns.map((w) => w.rule).sort();

  const withFallback = rules(at(".a { font-size: var(--type-body-sm, 14px); }"));
  const without = rules(at(".a { font-size: var(--type-body-sm); }"));

  check("a fallback site is counted as an unsanctioned token too",
    withFallback.includes("unsanctioned-size-token"), JSON.stringify(withFallback));
  check("dropping the fallback is a strict improvement",
    without.every((r) => withFallback.includes(r)) && without.length <= withFallback.length,
    JSON.stringify({ withFallback, without }));
}

console.log(`\n  ${failed === 0 ? "all type-rule tests passed" : `${failed} type-rule test(s) failed`}\n`);
process.exit(failed ? 1 : 0);
