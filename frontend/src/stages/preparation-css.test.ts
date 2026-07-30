import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// The 14px accessibility floor, checked at the source: every font-size in the
// variant stylesheets must resolve to 14px or more. Both halves are covered:
// the customer sheet (preparation.css) and the admin-only lab chunk
// (preparation-lab.css, refactor-2026-07 P4).
//
// This guard used to carry a hand-written token-to-px map, and the map went
// stale twice over. It still named --type-caption, --type-label and --type-lead
// long after tokens.css folded those three away, and because anything outside
// the map was a hard failure, every legitimate new token turned into a red
// build. The table is read from tokens.css now, which is where the values
// actually live, so adding a token no longer breaks this test. A token that is
// NOT defined there still fails, and that half is the half worth keeping: a
// font-size of var(--type-small) is invalid at computed-value time, so the
// element silently renders at whatever size it inherited.
//
// Relative units are refused on purpose. An em or a percentage cannot be
// resolved without knowing the parent, and that blind spot is exactly what hid
// .um-trend at 0.85em (11.9px) and .bullet__mark at 0.65em (10.4px) from the
// px-only checks for months (type-system P0). State the size you mean.

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(here, p), "utf8");
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const css = `${read("preparation.css")}\n${read("preparation-lab.css")}`;

// Type-system P4 moved every size out of the two prep sheets and onto the roles in
// design/type.css, so the floor has to be checked where the sizes now live. Both are
// read: type.css for the sizes the prep screens actually render at, and the two prep
// sheets so that a size sneaking back into a component sheet is still caught by the
// floor check rather than only by the guard.
const roleCss = read("../../../admin/src/styles/design/type.css");

// The token table, read from the one file that owns it. Both apps load it:
// frontend/src/main.js imports admin/src/styles/design.css, which imports
// design/tokens.css first. Comments are stripped before parsing because
// tokens.css is dense with trailing comments and several of them contain a
// semicolon, which would otherwise cut a declaration short.
const TOKENS = new Map<string, string>();
for (const m of stripComments(read("../../../admin/src/styles/design/tokens.css")).matchAll(
  /(--[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/gi,
)) {
  // Last definition wins, the way the cascade resolves a redefinition.
  TOKENS.set((m[1] || "").trim(), (m[2] || "").trim());
}

// Split on top-level commas only, so the nested arguments of a function inside
// clamp(1.75rem, 3.5vw, 2.25rem) do not get cut in half.
function splitArgs(inner: string): string[] {
  const out: string[] = [];
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

// The smallest px size a value can ever render at, or null when that cannot be
// known from the stylesheet alone. px is direct. rem is multiplied by 16
// because nothing in either app sets a root font-size, so 1rem is the browser
// default (a reader who has raised that default gets larger text, which is the
// point of rem and does not weaken the floor). var() resolves through
// tokens.css. clamp() is pinned by its first and third arguments: the middle
// one is the preferred value and is normally viewport-relative, so it is
// bounded by the other two.
//
// Everything else stays null and fails the test below, including calc(), min(),
// max() and any relative unit. Neither preparation sheet uses those shapes, so
// refusing them costs nothing today and fails closed rather than open tomorrow.
function floorPx(value: string, seen: ReadonlySet<string> = new Set()): number | null {
  const v = value.trim();

  const px = /^([\d.]+)px$/i.exec(v);
  if (px) return Number(px[1]);

  const rem = /^([\d.]+)rem$/i.exec(v);
  if (rem) return Number(rem[1]) * 16;

  const ref = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(v);
  if (ref) {
    const name = (ref[1] || "").trim();
    if (seen.has(name)) return null; // a token that points back at itself
    const def = TOKENS.get(name);
    if (def === undefined) return null;
    return floorPx(def, new Set(seen).add(name));
  }

  if (/^clamp\(/i.test(v)) {
    const args = splitArgs(v.slice(v.indexOf("(") + 1, v.lastIndexOf(")")));
    if (args.length !== 3) return null;
    const min = floorPx(args[0] || "", seen);
    const max = floorPx(args[2] || "", seen);
    if (min === null || max === null) return null;
    // The cap is checked too. A maximum below the floor is a malformed clamp,
    // not a legal size, so the smaller of the two ends is the honest answer.
    return Math.min(min, max);
  }

  return null;
}

test("no reading size survives in the prep sheets. The roles carry them", () => {
  assert.ok(css.length > 0, "stylesheet is non-empty");
  // The assertion used to be the opposite way round ("at least one font-size
  // declared"), which was right while these sheets owned their own sizes. P4 grouped
  // every reading selector into a role in type.css, and a size left behind in a
  // code-split sheet BEATS the role it was grouped into, so a survivor is the
  // half-applied failure mode rather than a harmless leftover.
  //
  // The bar is 20px, not zero, and the gap is deliberate: three display headings
  // (--type-h2 once, --type-h3 twice) are Phase 5's, not this phase's. Anything BELOW
  // 20px is reading text, and reading text has left these files.
  const strays = [...stripComments(css).matchAll(/font-size\s*:\s*([^;]+);/g)]
    .map((m) => (m[1] || "").trim())
    .filter((v) => {
      const px = floorPx(v);
      return px === null || px < 20;
    });
  assert.deepEqual(
    strays,
    [],
    `A reading size is back in preparation.css / preparation-lab.css. Both load after type.css, so it WINS over the role it was grouped into and half-applies it: ${strays.join(", ")}`,
  );
  assert.ok(/font-size\s*:/.test(roleCss), "type.css declares the sizes instead");
});

test("the token table really came from tokens.css", () => {
  // Without this, a parse that silently returned nothing would show up as every
  // font-size being unresolvable, which sends the reader to the wrong file.
  assert.ok(TOKENS.size > 50, `parsed ${TOKENS.size} tokens, expected the whole file`);
  assert.ok(TOKENS.has("--type-body-sm"), "the type scale is in the table");
});

test("every font-size resolves to >= 14px", () => {
  const declarations = [
    ...stripComments(`${roleCss}\n${css}`).matchAll(/font-size\s*:\s*([^;]+);/g),
  ].map((m) => (m[1] || "").trim());
  assert.ok(declarations.length > 0);
  for (const value of declarations) {
    const px = floorPx(value);
    assert.ok(
      px !== null,
      `font-size must resolve to a real px size. Not a known token or an absolute unit: ${value}`,
    );
    assert.ok(px >= 14, `${value} resolves to ${px}px, below the 14px floor`);
  }
});

test("colours come from tokens only. No literal colour values", () => {
  // Strip comments, then look for hex colours or rgb()/hsl() literals.
  const rules = stripComments(css);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(rules), "no hex colours");
  assert.ok(!/\b(?:rgb|rgba|hsl|hsla)\(/.test(rules), "no rgb()/hsl() colours");
});
