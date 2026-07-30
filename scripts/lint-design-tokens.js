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
 *   TYPE WARN (type-system plan, P1. Counted separately, held to a ceiling by
 *   scripts/test-design-guard.js, turned into errors by P6 once the debt they
 *   measure has been paid down):
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
 *   Why unit-aware resolution rather than a px check: the px-only rule could not
 *   see a fraction, so .um-trend shipped at 0.85em (11.9px) and .bullet__mark at
 *   0.65em (10.4px) and both sat under the floor for months looking clean.
 *
 *   The size rules read the `font:` shorthand as well as `font-size:`. Matching
 *   the property name alone left `font: 400 12px/16px <family>` clearing the
 *   floor, the ladder and T6 at once, which mattered the moment this phase
 *   published composites meant to be used in exactly that syntax.
 *
 * Exemptions — this list is the twin of DESIGN.md §6 "Exemptions". Change one, change the other.
 *   whole files — tokens.css (the source of truth), dev-badge.js, build-stamp.js,
 *   stages/design.js (the live design sheet),
 *   orb.css + motion.css (decorative animation signatures), app-nav.css (dark-rail on-dark
 *   translucency), app-nav.js + session-topbar.js (the brandmark LOGO SVG),
 *   recap-pdf.ts (pdfmake can't read CSS vars). Plus any *.test.* file.
 *   single line — add `lint-tokens-ignore` in a comment on the line (with a reason).
 *   token definitions — a line that assigns to a `--custom-property` may hold raw values.
 *   the parked gallery: admin/src/stages/tests/ skips the TYPE WARN rules only
 *   (TYPE_EXEMPT below). It keeps the 14px floor and the colour rules in full.
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
const SCAN_DIRS = ["admin/src", "frontend/src"];
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
  /(^|[\\/])recap-pdf\.ts$/, // pdfmake PDF output — can't read CSS vars; each hex names its token
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
const FONT_SIZE_PX = /font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px/gi;
const RADIUS_PX = /border-radius\s*:\s*([0-9]+(?:\.[0-9]+)?)px/gi;
const SPACING_PX = /\b(?:padding|margin|gap)(?:-[a-z]+)?\s*:\s*([^;{}]*)/gi;

// The type rules read whole declaration values, not just a px number. The
// lookbehind keeps `--my-font-size:` from being read as the real property.
const FONT_SIZE_DECL = /(?<![-\w])font-size\s*:\s*([^;{}]+)/gi;
const FONT_FAMILY_DECL = /(?<![-\w])font-family\s*:\s*([^;{}]+)/gi;
const VAR_REF = /var\(\s*(--[a-z0-9-]+)/gi;

/*
 * The eight type rules, all WARNINGS in this phase. They are counted separately
 * from `non-token-font` so the frozen nonTokenFont ceiling cannot move. Phase 6
 * of the type-system plan turns them into errors, once the debt they measure has
 * been paid down by phases 2 to 5.
 *
 * The CLI key on the right is what scripts/test-design-guard.js holds to a
 * ceiling. Every one of these must appear in the --json payload as a number, or
 * that guard hard-fails with "did not report".
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
];

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

  for (const block of parseBlocks(text)) {
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
   * non-token-font stays px-only on purpose. It is a legacy counter frozen at 13
   * and retired in Phase 6; widening it would move a ceiling that is meant to
   * only ever fall. The new literal-font-size type rule is the unit-aware
   * version and counts the rest.
   */
  FONT_SIZE_PX.lastIndex = 0;
  while ((m = FONT_SIZE_PX.exec(text))) {
    if (parseFloat(m[1]) >= 14) acc.warns.push({ rel, lineNo, rule: "non-token-font", snippet: m[0] });
  }

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
  return { errors: [], warns: [], typeWarns: [], report: { radius: 0, offGrid: 0 } };
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

  // Machine-readable mode — one JSON line, no prose. Consumed by test-design-guard.js.
  if (asJson) {
    console.log(
      JSON.stringify({
        scanned,
        errors: acc.errors.length,
        errorsByRule: Object.fromEntries(
          Object.entries(group(acc.errors)).map(([rule, list]) => [rule, list.length])
        ),
        errorDetail: acc.errors.map((e) => `${e.rel}:${e.lineNo}  [${e.rule}]  ${e.snippet}`),
        nonTokenFont: acc.warns.length,
        nonTokenFontDetail: acc.warns.map((w) => `${w.rel}:${w.lineNo}  ${w.snippet}`),
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
    process.exit(acc.errors.length ? 1 : 0);
  }

  console.log(`\ndesign-token guard — scanned ${scanned} files under ${SCAN_DIRS.join(", ")}\n`);

  if (acc.errors.length) {
    const by = group(acc.errors);
    console.log(`✗ ${acc.errors.length} error(s):\n`);
    for (const rule of Object.keys(by)) {
      console.log(`  [${rule}] : ${by[rule].length}`);
      for (const e of by[rule]) console.log(`    ${e.rel}:${e.lineNo}  ${e.snippet}`);
    }
    console.log("");
  }

  if (report) {
    const by = group(acc.warns);
    console.log(`~ ${acc.warns.length} warning(s) (non-token font-size >=14px):`);
    for (const rule of Object.keys(by)) console.log(`  [${rule}] : ${by[rule].length}`);
    console.log(`~ report: ${acc.report.radius} literal border-radius, ${acc.report.offGrid} off-grid spacing declarations\n`);
    console.log(`~ ${acc.typeWarns.length} type warning(s) (type-system P1, warnings until P6):`);
    for (const [rule] of TYPE_RULES) console.log(`  [${rule}] : ${(typeBy[rule] || []).length}`);
    console.log("");
  }

  if (acc.errors.length) {
    console.log(`FAIL — ${acc.errors.length} design-token violation(s). Fix or add a 'lint-tokens-ignore' comment with a reason.\n`);
    process.exit(1);
  } else {
    console.log(`PASS — no hard violations.${report ? "" : " Run with --report for warnings + grid counts."}\n`);
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
