import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// UI polish P3 collapsed ~15 hand-rolled pill families onto ONE chip recipe and
// three segmented controls onto one .seg. The whole point is that geometry lives
// in exactly one place, so this guard fails if a family starts re-declaring its
// own size/padding/radius again, which is precisely how it fragmented before.
//
// A chip now takes its recipe from TWO files, and that split is the reason this
// test was repointed in type-system P5. base.css keeps the geometry (the pill
// shape, its padding, its border). design/type.css owns the type, because a chip
// wears .type-label like every other 14px control in the app. Checking only
// base.css would therefore have gone half blind at exactly the moment the type
// moved out of it: a family that gave up its font-size in base.css and never
// joined .type-label renders at whatever it inherits, which is 16px in most
// containers, and nothing would say so.
const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(here, p), "utf8");
const BASE = read("base.css");
const TYPE = read("type.css");

// The families refitted onto the shared recipe, and the file each one lives in.
const REFITTED: Array<[string, string]> = [
  ["um-badge", "admin-tables.css"],
  ["pd-pill", "../pulse-drilldowns.css"],
  ["el-pill", "../error-log.css"],
  ["fb-pill", "../feedback-inbox.css"],
  ["fb-verdict", "../feedback-inbox.css"],
  ["fb-type", "../feedback-inbox.css"],
  ["cl-badge", "stage-extras.css"],
  ["lib-badge", "stage-review.css"],
  ["cmp-verdict-tag", "buttons-inputs.css"],
];

// A selector in a group is preceded by the start of a line or by the comma after
// its neighbour, and followed by a comma or by the opening brace if it is the last
// one. The old version anchored on the start of a line only, which worked while
// base.css was the one file being read: it writes the chip group one selector per
// line. type.css groups the ten chip families INTO an existing role, mid-line
// ("...  .label, .chip, .um-badge, .pd-pill, ..."), so a line anchor found none of
// them and the new half of this test would have failed on a correct file.
// The trailing lookahead is what keeps .fb-pill from matching .fb-pill--src.
const inGroup = (css: string, sel: string) =>
  new RegExp(`(?:^|,)\\s*\\.${sel}\\s*(?=,|\\{)`, "m").test(css);

test("every refitted family is grouped into the one chip recipe", () => {
  for (const [family] of REFITTED) {
    assert.ok(inGroup(BASE, family), `.${family} takes its geometry from the .chip recipe in base.css`);
    assert.ok(inGroup(TYPE, family), `.${family} takes its type from the .type-label role in type.css`);
  }
});

test("no refitted family re-declares its own chip geometry", () => {
  // Geometry belongs to the recipe; each file keeps only its colours.
  const GEOMETRY = /(border-radius|padding|font-size|font-weight)\s*:/;
  for (const [family, file] of REFITTED) {
    const css = read(file);
    // The bare family rule (not its --variant colour rules).
    const rule = new RegExp(`\\.${family}\\s*\\{([^}]*)\\}`).exec(css);
    if (!rule) continue; // rule deleted entirely — the cleanest outcome
    assert.ok(
      !GEOMETRY.test(rule[1]),
      `.${family} (${file}) must not re-declare chip geometry. It comes from base.css`,
    );
  }
});

test("no chip is squared. The house pill is fully rounded", () => {
  // These four were squared at 4px against the artifact's single pill recipe.
  for (const family of ["lib-badge", "cmp-verdict-tag", "fp-chip", "cl-tag"]) {
    const all = BASE + read("buttons-inputs.css") + read("stage-extras.css") + read("stage-review.css");
    const rule = new RegExp(`\\.${family}\\s*\\{([^}]*)\\}`).exec(all);
    if (rule && /border-radius/.test(rule[1])) {
      assert.ok(
        /--sero-radius-full/.test(rule[1]),
        `.${family} uses the full pill radius, not a squared one`,
      );
    }
  }
});

test("the three segmented controls share one recipe", () => {
  for (const seg of ["el-filters", "rv-seg"]) {
    assert.ok(inGroup(BASE, seg), `.${seg} joins the shared .seg container`);
  }
  for (const btn of ["el-filter", "rv-seg__btn"]) {
    assert.ok(inGroup(BASE, btn), `.${btn} joins the shared .seg__btn`);
  }
});

test("an active segment takes the accent tint, never a solid blue fill", () => {
  const active = /\.seg__btn\.is-active,[\s\S]*?\{([^}]*)\}/.exec(BASE);
  assert.ok(active, "the active-segment rule exists");
  assert.ok(/--color-accent-soft/.test(active![1]), "active segment sits on the accent tint");
  assert.ok(!/background:\s*var\(--color-accent\)/.test(active![1]), "never a solid accent fill");
});

test("the status-dot motif is on state pills, not on label pills", () => {
  const dotRule = /\.chip--dot::before,([\s\S]*?)\{/.exec(BASE);
  assert.ok(dotRule, "the dot motif rule exists");
  const selectors = dotRule![1];
  // States you read at a glance get a dot...
  for (const s of ["um-badge--back", "pd-pill--once", "fb-verdict--yes"]) {
    assert.ok(selectors.includes(s), `${s} carries the status dot`);
  }
  // ...plain labels (role, source, type) do not — a dot on everything says nothing.
  for (const s of ["um-badge--admin", "fb-pill--src", "el-pill--api"]) {
    assert.ok(!selectors.includes(s), `${s} is a label, not a status. No dot`);
  }
});
