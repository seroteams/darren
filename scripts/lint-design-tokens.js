#!/usr/bin/env node
/*
 * lint-design-tokens.js — the design-system drift guard (design-system-tokens plan, P6).
 *
 * Pure Node (fs + regex). NO deps, NO install, NO network, NO OpenAI — always free.
 * Walks admin/src + frontend/src for .css/.js/.ts and fails (exit 1) on design-token
 * integrity violations that a human reviewer would otherwise have to catch by eye:
 *
 *   COLOUR + FLOOR ERRORS (always have been):
 *     · raw-hex        — a #rgb/#rrggbb colour literal used as a value (not in a token def)
 *     · rgb-literal    — an rgb()/rgba() colour literal used as a value (not in a token def)
 *     · hex-fallback   — a var(--token, #hex | rgba(...)) fallback (drop it; tokens always exist)
 *     · sub-14px-font  — font-size below the 14px accessibility floor (DESIGN §3)
 *
 *   TYPE ERRORS (type-system P1 built them as warnings; P6 flipped them, once phases
 *   2 to 5 had driven every one of them to ZERO. A rule flipped while its count is
 *   non-zero is a rule that gets reverted, so the sequencing was the point):
 *     · relative-font-size            em / % / calc / anything unresolvable
 *     · off-ladder-font               a static size off 14 / 16 / 18 / 20 / 24 / 30 / 36
 *     · unsanctioned-size-token       font-size: var(--x) where --x is not a --type-size-*
 *     · undefined-token               a var(--x) with no definition anywhere in either app
 *     · clamp-off-rung                a clamp() font-size whose endpoints are not both rungs
 *     · display-face-below-20         the Bricolage display face under 20px (DESIGN.md T6)
 *     · font-family-literal           a font-family stack written out instead of tokenised
 *     · font-shorthand-resets-numeric a font: shorthand AFTER font-variant-numeric, which
 *                                     silently resets the tabular figures it was meant to keep
 *     · literal-font-size             a size written as a literal in any unit, not a token.
 *                                     Without it the counters above could be driven to zero
 *                                     by swapping tokens for rem literals on a rung, which
 *                                     reads as a finished migration and is the same debt.
 *
 *     · type-property-outside-type-layer
 *                                     THE headline rule, and the one thing the whole
 *                                     migration was for: any of the eight type
 *                                     properties declared outside design/tokens.css and
 *                                     design/type.css. It replaced an invariant that
 *                                     could never be measured ("font-size appears in
 *                                     exactly two files", checked by grep) with one that
 *                                     reads declarations, so a comment, a test assertion
 *                                     and a JS object key cannot trip it. P6 landed it
 *                                     counted at 142 and it rose to 164; P5b swept the
 *                                     last sixteen sheets to ZERO and flipped it here,
 *                                     and deleted its ceiling from
 *                                     scripts/test-design-guard.js, because an error
 *                                     needs no ceiling.
 *
 *   RETIRED IN P6: the px-only `non-token-font` warning. Every hit it had was also a
 *   literal-font-size hit, so it reported one debt under two names and held two
 *   ceilings that could disagree with each other.
 *
 *   REPORT ONLY (with --report): off-grid spacing + literal border-radius counts.
 *
 *   Why unit-aware resolution rather than a px check: the px-only rule could not
 *   see a fraction, so .um-trend shipped at 0.85em (11.9px) and .bullet__mark at
 *   0.65em (10.4px) and both sat under the floor for months looking clean.
 *
 *   The size rules read the `font:` shorthand as well as `font-size:`. Matching
 *   the property name alone left `font: 400 12px/16px <family>` clearing the
 *   floor, the ladder and T6 at once, which mattered the moment this phase
 *   published composites meant to be used in exactly that syntax.
 *
 * EXEMPTIONS, every one with the reason. This list is the twin of DESIGN.md §6
 * "Exemptions": change one, change the other.
 *
 *   WHOLE FILES (ALLOWLIST below), skipped entirely so no rule sees them:
 *     · design/tokens.css        the source of truth. It is where raw values are
 *                                SUPPOSED to live, and it is still read for the token
 *                                table even though it is never checked.
 *     · ui/dev-badge.js,
 *       ui/build-stamp.js        dev/debug chrome. A deliberate terminal-style kit with
 *                                its own dark mono palette, never shown to a customer.
 *     · stages/design.js         the live design sheet. It DEMONSTRATES the system,
 *                                including illustrative glyphs in its mock cards, so it
 *                                documents the rules rather than being bound by them.
 *     · design/orb.css,
 *       design/motion.css        decorative signatures (the thinking orb's gradient, the
 *                                aura/shimmer). One-offs with no token home.
 *     · design/app-nav.css       alpha-white translucency over the dark rail. No token.
 *     · ui/app-nav.js,
 *       ui/session-topbar.js     the brandmark LOGO SVG. It is the mark, not an icon,
 *                                and its fills are the mark's own.
 *     · ui/recap-pdf.ts          pdfmake cannot read a CSS variable. Each hex names its
 *                                token and each fontSize is a print rung derived from
 *                                the roles; both held by ui/recap-pdf.test.ts.
 *     · notifications/
 *       email-layout.ts,
 *       email-type.ts            mail clients strip <style>, so an email has no
 *                                stylesheet, no classes and no custom properties. Inline
 *                                hex and a literal system-font stack are forced, not
 *                                drift. email-type.ts is to email what tokens.css is to
 *                                the screens. Held by email-layout.test.ts, which parses
 *                                the REAL tokens.css and compares rung by rung.
 *     · *.test.*                 a test that asserts on a bad value has to contain one.
 *
 *   STRUCTURAL TYPE RULES ONLY (TYPE_EXEMPT below, narrower than ALLOWLIST):
 *     · admin/src/stages/tests/  the parked gallery. Design sketches behind /test that
 *                                no customer reaches (plan.md, "Parked"). The 14px floor
 *                                and the colour rules still apply IN FULL: parked is not
 *                                the same as unreadable.
 *
 *   VALUES THAT SET NO TYPE (type-property-outside-type-layer only):
 *     · inherit / initial / unset / revert / revert-layer
 *                                a CSS-wide keyword hands the property back to the
 *                                cascade rather than setting a value. `font: inherit` on
 *                                a <button> is how a control rejoins the page face at
 *                                all, so counting it would make the rule unsatisfiable
 *                                for every control in the app.
 *
 *   TEXT-TRANSFORM, AND WHY THE RULE STILL COVERS IT (P5b decided this, so the next
 *   reader does not reopen it). `uppercase` IS a type level: .type-overline is built out
 *   of it and P5b added .type-caps for three badges that are set in caps without being
 *   eyebrows. `capitalize` and `lowercase` are not: they REWRITE the words, so they can
 *   never be expressed as a rung and there is nothing for a role to carry. Narrowing the
 *   rule to drop text-transform would have taken .type-overline's uppercase out of the
 *   layer with them, so the property stays in and the two content-shaping sites are
 *   waived by line, each with its reason.
 *
 *   SINGLE LINES:
 *     · `lint-tokens-ignore` in a comment ON the declaration line, with a stated reason.
 *       Live waivers, four of them:
 *         design/mobile.css      font-size: max(1rem, 1em), the iOS focus-zoom guard,
 *                                which has no token form and must NOT become one.
 *         ui/account-sheet.ts    letter-spacing: 3px, which spreads the masked
 *                                password's bullets: decoration, not tracking.
 *         design/admin-tables.css
 *                                letter-spacing: 1px on .um-menu-btn, the same call one
 *                                glyph over: it spreads the three dots of the row-actions
 *                                mark. And text-transform: capitalize on .um-menu__item,
 *                                which re-cases role names the API returns lower-cased.
 *         design/briefing.css    text-transform: lowercase on .action-when, which
 *                                re-cases pill labels the model returns capitalised.
 *         styles/tailwind.css    font-weight on .link. It is the one type declaration in
 *                                the app that cannot move: it has to stay inside
 *                                @layer components so a Tailwind utility still beats it,
 *                                and design/type.css is unlayered.
 *     · a line that assigns to a `--custom-property` may hold raw values.
 *
 * Usage:  node scripts/lint-design-tokens.js [--report] [--json]
 *
 * --json prints one machine-readable line instead of the human report. That is what
 * scripts/test-design-guard.js reads to hold the warn/radius/spacing counts to a ceiling,
 * so drift that isn't a hard error still can't grow. Exit codes are identical either way.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
/*
 * backend/api/services/notifications joined the walk in type-system P6, and the
 * reason is the whole point of the rule below it. The guard had only ever walked the
 * two front ends, so backend/api/services/notifications/email-layout.ts sat outside
 * every check in the repo and quietly became a FOURTH type system: font-size 11, 12,
 * 12.5, 14, 15, 22 and 23px, three of them below the 14px floor, plus fourteen hex
 * literals of which eleven match no Sero token. Nothing failed, because nothing
 * looked.
 *
 * Adding the directory costs nothing today (it is the only place under backend/ with
 * a type property or a hex) and it means the NEXT file dropped in there is seen on
 * arrival. email-layout.ts itself is allowlisted below, because an email genuinely
 * has to be inline hex and a literal font stack; its type is held by
 * email-layout.test.ts instead, which is a stronger check than this file could make.
 */
const SCAN_DIRS = ["admin/src", "frontend/src", "backend/api/services/notifications"];
const EXTS = new Set([".css", ".js", ".ts"]);

const ALLOWLIST = [
  /(^|[\\/])tokens\.css$/,
  /(^|[\\/])dev-badge\.js$/,
  /(^|[\\/])build-stamp\.js$/,
  /(^|[\\/])stages[\\/]design\.js$/,
  /(^|[\\/])orb\.css$/, // decorative thinking-orb gradient (signature)
  /(^|[\\/])motion\.css$/, // decorative aura/shimmer (signature)
  /(^|[\\/])app-nav\.css$/, // dark-rail on-dark alpha-white translucency (no token home)
  /(^|[\\/])app-nav\.js$/, // brandmark LOGO SVG (both apps)
  /(^|[\\/])session-topbar\.js$/, // brandmark LOGO SVG
  // pdfmake PDF output. can't read CSS vars. Each hex names its token, AND each
  // fontSize is a print rung derived from the roles (pt = px x 0.75). Both halves are
  // held by admin/src/ui/recap-pdf.test.ts, which is the only thing that can hold a
  // file this guard is not allowed to read.
  /(^|[\\/])recap-pdf\.ts$/,
  // The email shell. Mail clients strip <style>, so it has no stylesheet, no classes
  // and no custom properties: inline hex and a literal system-font stack are forced,
  // not drift. Its sizes come from ./email-type.ts and are asserted against the real
  // design/tokens.css by email-layout.test.ts.
  /(^|[\\/])email-layout\.ts$/,
  // email-type.ts is to email what design/tokens.css is to the screens: the ONE file
  // allowed to write the numbers out. Like tokens.css it is exempt from being checked
  // and is instead the thing everything else is checked against. by
  // email-layout.test.ts, which parses the real tokens.css and compares them rung by
  // rung. It is here for the same mechanical reason tokens.css is: it emits
  // `font-size:${n}px` from a template literal, which no static resolver can read.
  /(^|[\\/])email-type\.ts$/,
  /\.test\./,
];

const isAllowlisted = (rel) => ALLOWLIST.some((re) => re.test(rel));

/*
 * TYPE_EXEMPT is narrower than ALLOWLIST, and deliberately so.
 *
 * admin/src/stages/tests/ holds the five parked gallery prototypes. They are
 * design sketches behind /test that no customer ever reaches, plan.md parks
 * them, and holding 145 sketch font-sizes to the ladder would freeze a ceiling
 * made almost entirely of throwaway work.
 *
 * These files are exempt from the STRUCTURAL type rules only. The 14px
 * accessibility floor and the colour rules still apply to them in full: parked
 * is not the same as unreadable, and a prototype Carl opens is still a screen.
 * The floor check sits outside checkTypeLine for exactly that reason.
 */
const TYPE_EXEMPT = [/^admin\/src\/stages\/tests\//];
const isTypeExempt = (rel) => TYPE_EXEMPT.some((re) => re.test(rel));

/*
 * THE TWO-FILE LAW (type-system P6). the sanctioned home of every type property.
 *
 * design/tokens.css holds the ladder (Layer 1) and design/type.css holds the
 * fourteen roles and the composites (Layers 2 and 3). A type property declared
 * anywhere else is a second opinion about the same decision, and the whole
 * migration exists because the app had accumulated several hundred of them.
 *
 * These are matched on the FULL relative path, not the basename, so a file that
 * happens to be called type.css somewhere else does not inherit the licence.
 */
const SANCTIONED_TYPE_FILES = [
  "admin/src/styles/design/tokens.css",
  "admin/src/styles/design/type.css",
];
const isSanctionedTypeFile = (rel) => SANCTIONED_TYPE_FILES.includes(rel);

/*
 * The eight properties the law covers. Every one of them can change how text
 * looks on its own, which is why the list is not just `font-size`: a stray
 * `font-weight: 600` or `letter-spacing: 0.05em` in a component sheet drifts a
 * role just as effectively as a size does, and until P6 nothing counted them at
 * all.
 */
const TYPE_PROPS = new Set([
  "font-size",
  "line-height",
  "font-weight",
  "letter-spacing",
  "font-family",
  "text-transform",
  "font-variant-numeric",
  "font",
]);

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

// Whole-text version of the same stripper, newlines preserved so line numbers
// still line up. Used by the block parser and the token-table builder, which
// both need to see a declaration that spans lines.
function blankCommentsAll(text) {
  const state = { inBlock: false };
  return text
    .split(/\r?\n/)
    .map((line) => {
      const s = stripComments(line, state.inBlock);
      state.inBlock = s.inBlock;
      return s.code;
    })
    .join("\n");
}

// --- the type ladder ---------------------------------------------------------
/*
 * The seven rungs are Tailwind's default scale, adopted whole by the type-system
 * plan. There is no 12px step: 14px is Sero's accessibility floor, so the ladder
 * starts there rather than defining a size nothing may use.
 *
 * The top rung is 36, not the 40 DESIGN.md T3 still states. Adopting a standard
 * scale whole means taking its top step too, and Carl approved the 36px hero at
 * the specimen mockup (docs/plans/doing/type-system/plan.md, "Decisions taken").
 * DESIGN.md is rewritten in Phase 6, when the migration it describes is finished.
 */
const RUNGS = [14, 16, 18, 20, 24, 30, 36];
const SANCTIONED_SIZE_TOKENS = new Set([
  "--type-size-sm",
  "--type-size-base",
  "--type-size-lg",
  "--type-size-xl",
  "--type-size-2xl",
  "--type-size-3xl",
  "--type-size-4xl",
]);

const CSS_WIDE = /^(inherit|initial|unset|revert|revert-layer)$/i;
const REL_UNIT = /^[\d.]+(em|ex|ch|%|vw|vh|vmin|vmax|pt|pc|cm|mm|in|q|lh|rlh|cap|ic)$/i;
const BARE_VAR = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i;
// The first token a value reaches for, fallback or not.
const FIRST_VAR = /var\(\s*(--[a-z0-9-]+)/i;

// Peel every var() out of a value, so what is left is only the literal text.
const stripVars = (v) => {
  let bare = String(v);
  let prev;
  do {
    prev = bare;
    bare = bare.replace(/var\([^()]*\)/g, "");
  } while (bare !== prev);
  return bare;
};

// Split on top-level commas only, so the nested function inside one argument of
// clamp(1.75rem, 3.5vw, 2.25rem) does not get cut in half.
function splitArgs(inner) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const inside = (v) => v.slice(v.indexOf("(") + 1, v.lastIndexOf(")"));
const round3 = (n) => Math.round(n * 1000) / 1000;

/*
 * resolveFontSize returns the smallest px size a value can ever render at, or a
 * named reason why that cannot be known.
 *
 * The px-only check this replaces could not see a fraction, which is how
 * .um-trend shipped at 0.85em (11.9px in a 14px table, on 37 rows) and
 * .bullet__mark at 0.65em (10.4px). Both were invisible to the guard for
 * months. Anything this function cannot resolve is reported rather than
 * ignored, because "not seen" is what caused the breach.
 *
 * rem is multiplied by 16 because nothing in either app sets a root font-size,
 * so 1rem is the browser default. That is a lint-time model, not a runtime
 * guarantee: a reader who has raised their browser default sees rem scale and
 * px not, which is the whole point of moving to rem.
 *
 * Returns { px } (plus { clamp: [lo, hi] } and { token } where they apply),
 * { skip: true } for a CSS-wide keyword, or { unresolvable: <reason> }.
 */
function resolveFontSize(value, tokens = new Map(), seen = new Set()) {
  const v = String(value).trim().replace(/\s*!important$/i, "").trim();
  if (!v) return { unresolvable: "unrecognised" };
  if (CSS_WIDE.test(v)) return { skip: true };

  let m;
  if ((m = /^([\d.]+)px$/i.exec(v))) return { px: round3(Number(m[1])) };
  if ((m = /^([\d.]+)rem$/i.exec(v))) return { px: round3(Number(m[1]) * 16) };

  if ((m = BARE_VAR.exec(v))) {
    const name = m[1].toLowerCase();
    if (seen.has(name)) return { unresolvable: "token-cycle", token: name };
    const def = tokens.get(name);
    if (def === undefined || def === "") return { unresolvable: "unknown-token", token: name };
    const next = new Set(seen);
    next.add(name);
    return { ...resolveFontSize(def, tokens, next), token: name };
  }
  // var(--x, <fallback>): the fallback is banned for the same reason the colour
  // rule bans it. Tokens always exist, so a fallback only ever hides a typo.
  if (/^var\(/i.test(v)) return { unresolvable: "var-fallback" };

  if (/^clamp\(/i.test(v)) {
    const args = splitArgs(inside(v));
    if (args.length !== 3) return { unresolvable: "malformed-clamp" };
    // The middle argument is the preferred value and is normally viewport
    // relative, so it is bounded by the other two and never needs resolving.
    const lo = resolveFontSize(args[0], tokens, seen);
    const hi = resolveFontSize(args[2], tokens, seen);
    if (typeof lo.px !== "number") return { unresolvable: lo.unresolvable || "unrecognised" };
    if (typeof hi.px !== "number") return { unresolvable: hi.unresolvable || "unrecognised" };
    return { px: Math.min(lo.px, hi.px), clamp: [lo.px, hi.px] };
  }

  if (/^min\(/i.test(v)) {
    const parts = splitArgs(inside(v)).map((a) => resolveFontSize(a, tokens, seen));
    const bad = parts.find((p) => typeof p.px !== "number");
    if (bad) return { unresolvable: bad.unresolvable || "unrecognised" };
    return { px: Math.min(...parts.map((p) => p.px)) };
  }

  if (/^max\(/i.test(v)) {
    // max() returns the largest argument, so one argument that provably clears
    // the floor pins the whole expression. That is what makes mobile.css's
    // `font-size: max(1rem, 1em)` iOS zoom guard safe rather than a red build.
    const ok = splitArgs(inside(v))
      .map((a) => resolveFontSize(a, tokens, seen))
      .filter((p) => typeof p.px === "number");
    if (!ok.length) return { unresolvable: "unrecognised" };
    return { px: Math.max(...ok.map((p) => p.px)) };
  }

  if (/^calc\(/i.test(v)) return { unresolvable: "calc" };
  if (REL_UNIT.test(v)) return { unresolvable: "relative-unit" };
  return { unresolvable: "unrecognised" };
}

// Does this font-family value land on the display face? Either it names
// Bricolage outright or it reaches --type-family-display through a token.
// Split on top-level whitespace or a top-level separator, so clamp(1.5rem, 3vw,
// 2.25rem)/1.2 stays in one piece instead of being cut inside its own arguments.
function splitTopLevel(v, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of String(v)) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    const isSep = depth === 0 && (sep === " " ? /\s/.test(ch) : ch === sep);
    if (isSep) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const LENGTHISH = /^[\d.]+(px|rem|em|ex|ch|%|vw|vh|vmin|vmax|pt|pc|cm|mm|in|q|lh|rlh|cap|ic)$/i;
const FUNCISH = /^(var|clamp|calc|min|max)\(/i;
// The system font keywords set everything at once and carry no size of their own.
const FONT_SYSTEM = /^(caption|icon|menu|message-box|small-caption|status-bar)$/i;

/*
 * The size and family carried inside a `font:` shorthand.
 *
 * Every size rule in this file used to match the literal property `font-size`,
 * so `font: 400 12px/16px <family>` cleared the 14px floor, the ladder and the
 * T6 display-face rule all at once. That gap mattered the moment this phase
 * published fourteen --type-role-* composites whose whole purpose is to be
 * applied as `font: var(--type-role-x)`: the guard could not see the syntax the
 * design system was telling people to use.
 *
 * Grammar: [style] [variant] [weight] [stretch] size[/line-height] family.
 * Everything before the size is a keyword or a bare number, so a top-level slash
 * is the strongest signal; failing that, the size is the first part that is a
 * length or resolves to one. `var(--type-weight-regular)` must NOT be mistaken
 * for the size, which is why a bare function has to resolve to a real px value
 * before it is accepted.
 */
function fontShorthandParts(value, tokens = new Map(), seen = new Set()) {
  const v = String(value).trim().replace(/\s*!important$/i, "").trim();
  if (!v || CSS_WIDE.test(v) || FONT_SYSTEM.test(v)) return null;

  const solo = BARE_VAR.exec(v);
  if (solo) {
    const name = solo[1].toLowerCase();
    if (seen.has(name)) return null;
    const def = tokens.get(name);
    if (def === undefined || def === "") return null;
    const next = new Set(seen);
    next.add(name);
    return fontShorthandParts(def, tokens, next);
  }

  const parts = splitTopLevel(v, " ");
  const take = (i, size) => ({ size, family: parts.slice(i + 1).join(" ").trim() });

  for (let i = 0; i < parts.length; i++) {
    const halves = splitTopLevel(parts[i], "/");
    if (halves.length >= 2) return take(i, halves[0]);
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (LENGTHISH.test(p)) return take(i, p);
    if (FUNCISH.test(p)) {
      const res = resolveFontSize(p, tokens);
      if (typeof res.px === "number" || res.clamp) return take(i, p);
    }
  }
  return null;
}

// Every value on this line that ends up sizing text, whichever property carried
// it. One list so the floor rule and the ladder rules can never disagree about
// what counts as a font size.
const FONT_DECL = /(?<![-\w])font\s*:\s*([^;{}]+)/gi;
function fontSizeValues(text, tokens) {
  const out = [];
  let m;
  FONT_SIZE_DECL.lastIndex = 0;
  while ((m = FONT_SIZE_DECL.exec(text))) {
    out.push({ raw: m[1].trim().replace(/\s*!important$/i, "").trim(), via: "font-size" });
  }
  FONT_DECL.lastIndex = 0;
  while ((m = FONT_DECL.exec(text))) {
    const parts = fontShorthandParts(m[1], tokens);
    if (parts && parts.size) out.push({ raw: parts.size, via: "font", family: parts.family });
  }
  return out;
}

function isDisplayFamily(value, tokens = new Map(), seen = new Set()) {
  const v = String(value);
  if (/bricolage/i.test(v)) return true;
  for (const m of v.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
    const name = m[1].toLowerCase();
    if (name === "--type-family-display") return true;
    if (seen.has(name)) continue;
    seen.add(name);
    const def = tokens.get(name);
    if (def && isDisplayFamily(def, tokens, seen)) return true;
  }
  return false;
}

// --- rules -------------------------------------------------------------------
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGB = /\brgba?\(/;
const VAR_FALLBACK_LITERAL = /var\(\s*--[a-z0-9-]+\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\()/i;
const IS_TOKEN_DEF = /^\s*--[a-z0-9-]+\s*:/i; // a custom-property definition may hold raw values
const RADIUS_PX = /border-radius\s*:\s*([0-9]+(?:\.[0-9]+)?)px/gi;
const SPACING_PX = /\b(?:padding|margin|gap)(?:-[a-z]+)?\s*:\s*([^;{}]*)/gi;

// The type rules read whole declaration values, not just a px number. The
// lookbehind keeps `--my-font-size:` from being read as the real property.
const FONT_SIZE_DECL = /(?<![-\w])font-size\s*:\s*([^;{}]+)/gi;
const FONT_FAMILY_DECL = /(?<![-\w])font-family\s*:\s*([^;{}]+)/gi;
const VAR_REF = /var\(\s*(--[a-z0-9-]+)/gi;

/*
 * The ten type rules. ALL TEN are errors as of P5b (see TYPE_ERRORS below).
 *
 * Severity is applied at REPORT time, not here: every rule lands in acc.typeWarns
 * so the per-rule counts and the detail lines keep working whatever its severity,
 * and only the reporter decides which counts fail the run. Routing errors into
 * acc.errors at push time instead would have emptied the very counters
 * scripts/test-design-guard.js and scripts/test-type-rules.js assert on.
 *
 * Every one of these must still appear in the --json payload as a number: nine of
 * them no longer have a ceiling to breach, but scripts/test-type-rules.js asserts
 * on the counts directly and a missing key would read as zero.
 */
const TYPE_RULES = [
  ["relative-font-size", "relativeFontSize"],
  ["off-ladder-font", "offLadderFont"],
  ["unsanctioned-size-token", "unsanctionedSizeToken"],
  ["undefined-token", "undefinedToken"],
  ["clamp-off-rung", "clampOffRung"],
  ["display-face-below-20", "displayFaceBelow20"],
  ["font-family-literal", "fontFamilyLiteral"],
  ["font-shorthand-resets-numeric", "fontShorthandResetsNumeric"],
  ["literal-font-size", "literalFontSize"],
  ["type-property-outside-type-layer", "typePropOutsideTypeLayer"],
];

/*
 * Which of the rules above FAIL the build. All ten, as of P5b.
 *
 * Every one was measured at ZERO immediately before it was flipped, never
 * predicted, so a flip could not red the build for the parallel sessions sharing
 * this checkout. That sequencing is the point: a rule flipped while its count is
 * non-zero is a rule that gets reverted. Nine went in P6; the tenth went here,
 * once P5b had cleared 164 declarations out of 31 component sheets and
 * `node scripts/lint-design-tokens.js --json` reported
 * typePropOutsideTypeLayer: 0.
 */
const TYPE_ERRORS = new Set([
  "relative-font-size",
  "off-ladder-font",
  "unsanctioned-size-token",
  "undefined-token",
  "clamp-off-rung",
  "display-face-below-20",
  "font-family-literal",
  "font-shorthand-resets-numeric",
  "literal-font-size",
  "type-property-outside-type-layer",
]);

const pushType = (acc, rel, lineNo, rule, snippet) =>
  acc.typeWarns.push({ rel, lineNo, rule, snippet });

// Everything a single declaration can be judged on by itself.
function checkTypeLine(rel, lineNo, text, acc, tokens) {
  let m;

  for (const v of fontSizeValues(text, tokens)) {
    const raw = v.raw;
    const label = v.via === "font" ? `font: … ${raw}` : `font-size: ${raw}`;
    const res = resolveFontSize(raw, tokens);
    if (res.skip) continue;

    /*
     * Read the token name even when it is wearing a fallback. Matching only a
     * bare var() put `font-size: var(--old, 14px)` in relative-font-size and
     * nowhere else, so following this guard's own advice and dropping the
     * fallback moved the site into unsanctioned-size-token and broke a ceiling
     * that had not moved. Counting it here from the start means dropping a
     * fallback can only ever remove a hit.
     */
    FIRST_VAR.lastIndex = 0;
    const named = FIRST_VAR.exec(raw);
    if (named && !SANCTIONED_SIZE_TOKENS.has(named[1].toLowerCase())) {
      pushType(acc, rel, lineNo, "unsanctioned-size-token", `${label.split(":")[0]}: var(${named[1]})`);
    }

    if (res.unresolvable) {
      // An unknown token is already reported by undefined-token below. Reporting
      // it twice would make one typo look like two separate kinds of drift.
      if (res.unresolvable !== "unknown-token") {
        pushType(acc, rel, lineNo, "relative-font-size", `${label} (${res.unresolvable})`);
      }
    } else if (res.clamp) {
      if (!RUNGS.includes(res.clamp[0]) || !RUNGS.includes(res.clamp[1])) {
        pushType(acc, rel, lineNo, "clamp-off-rung", `${label} (${res.clamp.join(" to ")}px)`);
      }
    } else if (!RUNGS.includes(res.px)) {
      pushType(acc, rel, lineNo, "off-ladder-font", `${label} (${res.px}px)`);
    }

    /*
     * A size written as a literal rather than a token, in any unit. Without this
     * every counter here could be driven to zero by swapping tokens for rem
     * literals that happen to land on a rung, which would read as a finished
     * migration rather than the same debt in a different unit. The legacy
     * non-token-font warning only ever saw px.
     */
    if (!res.token && typeof res.px === "number") {
      pushType(acc, rel, lineNo, "literal-font-size", `${label} (${res.px}px)`);
    }

    // A shorthand carries its family on the same line, so it can be judged here
    // rather than by the block rules that pair separate declarations.
    if (v.via === "font" && v.family) {
      if (typeof res.px === "number" && res.px < 20 && isDisplayFamily(v.family, tokens)) {
        pushType(acc, rel, lineNo, "display-face-below-20", `font: … ${raw} ${v.family} (${res.px}px)`);
      }
      if (/[a-z]/i.test(stripVars(v.family))) {
        pushType(acc, rel, lineNo, "font-family-literal", `font: … ${v.family}`);
      }
    }
  }

  FONT_FAMILY_DECL.lastIndex = 0;
  while ((m = FONT_FAMILY_DECL.exec(text))) {
    const raw = m[1].trim();
    if (CSS_WIDE.test(raw)) continue; // a reset cannot introduce a new face
    let bare = raw;
    let prev;
    do {
      prev = bare;
      bare = bare.replace(/var\([^()]*\)/g, "");
    } while (bare !== prev);
    if (/[a-z]/i.test(bare)) {
      pushType(acc, rel, lineNo, "font-family-literal", `font-family: ${raw}`);
    }
  }

  VAR_REF.lastIndex = 0;
  while ((m = VAR_REF.exec(text))) {
    const name = m[1].toLowerCase();
    if (!tokens.has(name)) pushType(acc, rel, lineNo, "undefined-token", `var(${name})`);
  }
}

/*
 * Two rules need to see a whole rule block, not one line:
 *
 *   display-face-below-20        pairs a font-family with the font-size beside it
 *   font-shorthand-resets-numeric  is entirely about the ORDER of two declarations
 *
 * The parser walks brace depth over the comment-blanked text, so it reads a CSS
 * file and a template-literal <style> block in a .js file the same way.
 */
function parseBlocks(text) {
  const src = blankCommentsAll(text);
  const blocks = [];
  const stack = [];
  let buf = "";
  let line = 1;
  let declLine = 1;

  const flush = () => {
    const top = stack[stack.length - 1];
    const i = buf.indexOf(":");
    if (top && i > 0) {
      const prop = buf.slice(0, i).trim().toLowerCase();
      if (/^[-a-z]+$/.test(prop)) {
        top.decls.push({ prop, value: buf.slice(i + 1).trim(), lineNo: declLine });
      }
    }
    buf = "";
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\n") {
      line += 1;
      if (buf) buf += " ";
      continue;
    }
    if (ch === "{") {
      const b = { decls: [] };
      blocks.push(b);
      stack.push(b);
      buf = "";
      continue;
    }
    if (ch === "}") {
      flush();
      stack.pop();
      continue;
    }
    if (ch === ";") {
      flush();
      continue;
    }
    if (!buf.trim() && !/\s/.test(ch)) declLine = line;
    buf += ch;
  }
  return blocks;
}

function checkTypeBlocks(rel, text, acc, tokens) {
  const lines = text.split(/\r?\n/);
  const waived = (lineNo) => /lint-tokens-ignore/.test(lines[lineNo - 1] || "");
  const sanctioned = isSanctionedTypeFile(rel);

  for (const block of parseBlocks(text)) {
    /*
     * The two-file law. One hit per DECLARATION, which is why it lives here on the
     * block parser rather than on a text match: the invariant this replaced was
     * `grep -l font-size` returning exactly two files, and that could never work.
     * tokens.css contains the string zero times (it defines --type-size-* and
     * never uses the property), five test files assert ON the string, and two more
     * carry it only inside a comment. Reading declarations means a comment, a test
     * and a JS object key are all invisible to it, and a real one is named with its
     * line.
     */
    if (!sanctioned) {
      for (const d of block.decls) {
        if (!TYPE_PROPS.has(d.prop)) continue;
        /*
         * A CSS-wide keyword sets no type VALUE, it hands the property back to the
         * cascade, so it cannot drift a role. It is also load-bearing: a <button>,
         * an <input> and a <textarea> inherit no type from the document at all, so
         * `font: inherit` is how a control rejoins the page face. Counting it would
         * make the rule unsatisfiable for every control in the app.
         */
        if (CSS_WIDE.test(String(d.value).trim())) continue;
        if (waived(d.lineNo)) continue;
        pushType(acc, rel, d.lineNo, "type-property-outside-type-layer", `${d.prop}: ${d.value}`);
      }
    }

    const last = (prop) => {
      for (let i = block.decls.length - 1; i >= 0; i--) if (block.decls[i].prop === prop) return i;
      return -1;
    };

    // DESIGN.md T6: the display face is legal at 20px and up. Below that the
    // Bricolage forms crowd and it reads as a rendering fault, not a choice.
    const famAt = last("font-family");
    const sizeAt = last("font-size");
    if (famAt >= 0 && sizeAt >= 0) {
      const fam = block.decls[famAt];
      const size = block.decls[sizeAt];
      if (isDisplayFamily(fam.value, tokens)) {
        const res = resolveFontSize(size.value, tokens);
        if (typeof res.px === "number" && res.px < 20 && !waived(size.lineNo)) {
          pushType(acc, rel, size.lineNo, "display-face-below-20", `display face at ${res.px}px`);
        }
      }
    }

    // The font: shorthand resets font-variant-numeric (and font-feature-settings)
    // to their initial values, so tabular figures survive only when declared
    // AFTER it. Shorthand last is the broken order: the digits silently go back
    // to proportional width and a column of numbers jitters as it ticks.
    const fvnAt = last("font-variant-numeric");
    const fontAt = last("font");
    if (fvnAt >= 0 && fontAt > fvnAt) {
      const shorthand = block.decls[fontAt];
      if (!waived(shorthand.lineNo)) {
        pushType(
          acc,
          rel,
          shorthand.lineNo,
          "font-shorthand-resets-numeric",
          `font: ${shorthand.value} after font-variant-numeric`
        );
      }
    }
  }
}

function checkLine(rel, lineNo, rawLine, state, acc, tokens = new Map()) {
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

  /*
   * The 14px floor. This is the one hard error in the file and it stays hard,
   * because the floor is a house non-negotiable rather than migration debt.
   *
   * It used to read px literals only, which is exactly how .um-trend shipped at
   * 0.85em (11.9px on 37 rows of the user list) and .bullet__mark at 0.65em
   * (10.4px) and sat there for months with the guard reporting PASS. It now
   * resolves rem, clamp endpoints and tokens, and reads the size out of a
   * `font:` shorthand as well, so a floor breach cannot hide behind a unit or a
   * property name. Anything it genuinely cannot resolve is left to the
   * relative-font-size warning rather than guessed at.
   */
  let m;
  for (const v of fontSizeValues(text, tokens)) {
    const res = resolveFontSize(v.raw, tokens);
    const lowest = res.clamp ? Math.min(...res.clamp) : res.px;
    if (typeof lowest === "number" && lowest < 14) {
      const how = v.via === "font" ? `font: … ${v.raw}` : `font-size: ${v.raw}`;
      acc.errors.push({ rel, lineNo, rule: "sub-14px-font", snippet: `${how} (${lowest}px, < 14px floor)` });
    }
  }

  /*
   * The legacy px-only `non-token-font` warning was RETIRED here in P6, as its own
   * comment always said it would be. Every hit it had was also a literal-font-size
   * hit, so keeping it meant reporting one debt under two names and holding two
   * ceilings that could disagree. Its last five live hits were all in one parked
   * gallery prototype. literal-font-size is the unit-aware replacement, and unlike
   * the old rule it can see a rem, a clamp endpoint and a `font:` shorthand.
   */

  // report-only: literal radius + off-grid spacing
  RADIUS_PX.lastIndex = 0;
  while ((m = RADIUS_PX.exec(text))) acc.report.radius++;
  SPACING_PX.lastIndex = 0;
  while ((m = SPACING_PX.exec(text))) {
    const nums = (m[1].match(/-?\d+(?:\.\d+)?px/g) || []).map((v) => parseFloat(v));
    if (nums.some((n) => n > 2 && n % 4 !== 0)) acc.report.offGrid++;
  }

  // The type rules, last so they can never change what the rules above report.
  if (!isTypeExempt(rel)) checkTypeLine(rel, lineNo, text, acc, tokens);
}

// --- run ---------------------------------------------------------------------
// One accumulator shape, built in one place, so the repo walk and
// scripts/test-type-rules.js can never drift apart on what a rule may push into.
function newAcc() {
  return { errors: [], typeWarns: [], report: { radius: 0, offGrid: 0 } };
}

// Lint a block of source as if it were the file at `rel`. It takes TEXT, not a
// path, because the tests feed it inline fixture strings. That is the whole
// point of the require.main guard below: a module that scans the repo and calls
// process.exit at import time cannot be unit-tested, which is why CLAUDE.md
// still forbids requiring scripts/gate.js.
function lintText(text, rel, acc = newAcc(), tokens = new Map()) {
  const state = { inBlock: false };
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => checkLine(rel, i + 1, line, state, acc, tokens));
  if (!isTypeExempt(rel)) checkTypeBlocks(rel, text, acc, tokens);
  return acc;
}

/*
 * Every custom property defined anywhere in the two apps, so undefined-token can
 * tell a typo from a token that simply lives in a component sheet. Definitions
 * are read from ALL files including the allowlisted ones: tokens.css is exempt
 * from being CHECKED, but it is the source of truth for what exists.
 *
 * setProperty("--x", …) counts as a definition too. A token written from JS is
 * real at runtime even though no stylesheet declares it, and flagging those
 * would report working code as drift.
 */
const TOKEN_DEF = /(--[a-z0-9-]+)\s*:\s*([^;{}]+)/gi;
const SET_PROPERTY = /setProperty\(\s*["'`](--[a-z0-9-]+)["'`]/gi;

function collectTokens(files) {
  const tokens = new Map();
  for (const abs of files) {
    const text = blankCommentsAll(fs.readFileSync(abs, "utf8"));
    let m;
    TOKEN_DEF.lastIndex = 0;
    while ((m = TOKEN_DEF.exec(text))) tokens.set(m[1].toLowerCase(), m[2].trim());
    SET_PROPERTY.lastIndex = 0;
    while ((m = SET_PROPERTY.exec(text))) {
      const name = m[1].toLowerCase();
      if (!tokens.has(name)) tokens.set(name, "");
    }
  }
  return tokens;
}

function scanRepo() {
  const files = [];
  for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);

  const tokens = collectTokens(files);
  const acc = newAcc();
  let scanned = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    if (isAllowlisted(rel)) continue;
    scanned++;
    lintText(fs.readFileSync(abs, "utf8"), rel, acc, tokens);
  }
  return { scanned, acc, tokens };
}

const group = (list) => {
  const by = {};
  for (const e of list) (by[e.rule] ||= []).push(e);
  return by;
};

function main() {
  const { scanned, acc } = scanRepo();
  const report = process.argv.includes("--report");
  const asJson = process.argv.includes("--json");
  const typeBy = group(acc.typeWarns);

  /*
   * Severity, applied here rather than at push time (P6). The nine rules in
   * TYPE_ERRORS join the colour and floor errors and fail the run; the rest are
   * counted and held to a ceiling by scripts/test-design-guard.js. Keeping the split
   * at report time is what lets every rule stay in typeWarns, so the per-rule counts
   * this file publishes are the same numbers whatever a rule's severity is.
   */
  const typeErrs = acc.typeWarns.filter((w) => TYPE_ERRORS.has(w.rule));
  const errors = [...acc.errors, ...typeErrs];

  // Machine-readable mode — one JSON line, no prose. Consumed by test-design-guard.js.
  if (asJson) {
    console.log(
      JSON.stringify({
        scanned,
        errors: errors.length,
        errorsByRule: Object.fromEntries(
          Object.entries(group(errors)).map(([rule, list]) => [rule, list.length])
        ),
        errorDetail: errors.map((e) => `${e.rel}:${e.lineNo}  [${e.rule}]  ${e.snippet}`),
        // How many of those errors came from a flipped type rule, so a reader can tell
        // a colour or floor violation from a ladder one without parsing the detail.
        typeErrors: typeErrs.length,
        literalRadius: acc.report.radius,
        offGridSpacing: acc.report.offGrid,
        // One key per type rule, always a number even at zero. Built from the
        // fixed TYPE_RULES list rather than from whatever happened to fire,
        // because a missing key makes test-design-guard.js fail outright with
        // "did not report".
        ...Object.fromEntries(TYPE_RULES.map(([rule, key]) => [key, (typeBy[rule] || []).length])),
        typeWarnDetail: acc.typeWarns.map((w) => `${w.rel}:${w.lineNo}  [${w.rule}]  ${w.snippet}`),
      })
    );
    process.exit(errors.length ? 1 : 0);
  }

  console.log(`\ndesign-token guard — scanned ${scanned} files under ${SCAN_DIRS.join(", ")}\n`);

  if (errors.length) {
    const by = group(errors);
    console.log(`✗ ${errors.length} error(s):\n`);
    for (const rule of Object.keys(by)) {
      console.log(`  [${rule}] : ${by[rule].length}`);
      for (const e of by[rule]) console.log(`    ${e.rel}:${e.lineNo}  ${e.snippet}`);
    }
    console.log("");
  }

  if (report) {
    console.log(`~ report: ${acc.report.radius} literal border-radius, ${acc.report.offGrid} off-grid spacing declarations\n`);
    console.log(`~ type rules (P5b: all ten are errors):`);
    for (const [rule] of TYPE_RULES) {
      const n = (typeBy[rule] || []).length;
      console.log(`  [${rule}] : ${n}${TYPE_ERRORS.has(rule) ? " (error)" : " (counted)"}`);
    }
    console.log("");
  }

  if (errors.length) {
    console.log(`FAIL: ${errors.length} design-token violation(s). Fix or add a 'lint-tokens-ignore' comment with a reason.\n`);
    process.exit(1);
  } else {
    console.log(`PASS: no hard violations.${report ? "" : " Run with --report for the type-rule table + grid counts."}\n`);
    process.exit(0);
  }
}

if (require.main === module) main();

module.exports = {
  ALLOWLIST,
  isAllowlisted,
  TYPE_EXEMPT,
  isTypeExempt,
  TYPE_RULES,
  TYPE_ERRORS,
  RUNGS,
  SANCTIONED_SIZE_TOKENS,
  stripComments,
  blankCommentsAll,
  resolveFontSize,
  isDisplayFamily,
  parseBlocks,
  checkLine,
  newAcc,
  lintText,
  collectTokens,
  scanRepo,
};
