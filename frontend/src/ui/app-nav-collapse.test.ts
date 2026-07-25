import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Regression guard for the left-rail collapse (2026-07-25). Clicking "Collapse
// menu" with a mouse left the button focused and the pointer on the rail, so the
// hover/focus peek held the rail at its open width while the page padding
// dropped to the icon strip: the rail overlaid the page and the click read as
// doing nothing. The fix is a pair — the nav JS blurs and sets `is-peek-off` on
// a pointer click, and the CSS peek rules skip a rail carrying that class. Both
// halves are checked here because either one alone leaves the bug in place.

const NAVS = [
  ["customer app", new URL("./app-nav.js", import.meta.url)],
  ["admin app", new URL("../../../admin/src/ui/app-nav.js", import.meta.url)],
] as const;

const css = readFileSync(
  new URL("../../../admin/src/styles/design/app-nav.css", import.meta.url),
  "utf8",
);

for (const [label, url] of NAVS) {
  test(`${label}: a pointer collapse drops focus and suspends the peek`, () => {
    const js = readFileSync(url, "utf8");
    assert.match(js, /collapsed && e\.detail > 0/, "pointer-only branch");
    assert.match(js, /collapseBtn\.blur\(\)/, "drops focus off the toggle");
    assert.match(js, /classList\.add\("is-peek-off"\)/, "suspends the peek");
    assert.match(
      js,
      /addEventListener\("pointerleave", \(\) => el\.classList\.remove\("is-peek-off"\)\)/,
      "peek returns once the pointer leaves the rail",
    );
  });
}

test("CSS: every hover-peek rule skips a rail with is-peek-off", () => {
  const hoverPeeks = [...css.matchAll(/^\s*body\.app-nav-collapsed \.app-nav[^\n{]*:hover[^\n{]*\{/gm)]
    .map((m) => m[0].trim());
  assert.ok(hoverPeeks.length > 0, "hover-peek rules still exist");
  for (const rule of hoverPeeks) {
    assert.ok(
      rule.includes(":not(.is-peek-off)"),
      `hover-peek rule must be gated: ${rule}`,
    );
  }
});

test("CSS: keyboard focus still peeks the collapsed rail open", () => {
  assert.match(
    css,
    /body\.app-nav-collapsed \.app-nav:focus-within \{\s*width: var\(--app-nav-w-open\)/,
    "focus-within stays ungated so tabbing into the rail shows the labels",
  );
});
