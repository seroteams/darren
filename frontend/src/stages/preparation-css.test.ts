import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The 14px accessibility floor, checked at the source: every font-size in the
// variant stylesheet must be an existing type token that resolves to >= 14px,
// or a literal >= 14px. New tokens can't sneak in — an unknown var() fails.

const css = readFileSync(new URL("./preparation.css", import.meta.url), "utf8");

// Existing type-scale tokens (admin/src/styles/design/tokens.css) → px.
const TOKEN_PX: Record<string, number> = {
  "--type-body-sm": 14,
  "--type-caption": 14,
  "--type-label": 14,
  "--type-body": 16,
  "--type-h4": 18,
  "--type-lead": 18,
  "--type-h3": 20,
  "--type-h2": 28, // clamp(1.75rem, 3.5vw, 2.25rem) — 28px is its floor
};

test("variant CSS exists and declares font sizes", () => {
  assert.ok(css.length > 0, "stylesheet is non-empty");
  assert.ok(/font-size\s*:/.test(css), "at least one font-size declared");
});

test("every font-size resolves to >= 14px from the existing token set", () => {
  const declarations = [...css.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => (m[1] || "").trim());
  assert.ok(declarations.length > 0);
  for (const value of declarations) {
    const varMatch = /^var\((--[\w-]+)\)$/.exec(value);
    if (varMatch && varMatch[1]) {
      const px = TOKEN_PX[varMatch[1]];
      assert.ok(px !== undefined, `unknown type token in preparation.css: ${value}`);
      assert.ok(px >= 14, `${value} resolves below the 14px floor`);
      continue;
    }
    const px = /^([\d.]+)px$/.exec(value);
    const rem = /^([\d.]+)rem$/.exec(value);
    if (px && px[1]) {
      assert.ok(Number(px[1]) >= 14, `literal ${value} below the 14px floor`);
    } else if (rem && rem[1]) {
      assert.ok(Number(rem[1]) * 16 >= 14, `literal ${value} below the 14px floor`);
    } else {
      assert.fail(`font-size must be a known token or px/rem literal, got: ${value}`);
    }
  }
});

test("colours come from tokens only — no literal colour values", () => {
  // Strip comments, then look for hex colours or rgb()/hsl() literals.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(rules), "no hex colours");
  assert.ok(!/\b(?:rgb|rgba|hsl|hsla)\(/.test(rules), "no rgb()/hsl() colours");
});
