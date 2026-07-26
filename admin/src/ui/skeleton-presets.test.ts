import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { skeletonFor } from "./skeleton-presets.ts";
import { skeletonHtml } from "./skeleton.js";
import { loadingHtml } from "./screen-scaffold.ts";

// The shared skeleton kit. A skeleton previews the shape of what's about to land,
// using the REAL layout classes of the screen it stands in for — so the ghost row
// is the same height as the loaded row and nothing jumps.

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
const read = (rel: string) => readFileSync(resolve(REPO, rel), "utf8");

// --- backwards compatibility -------------------------------------------------
// 28 call sites still pass a bare number. Their markup must not move.

// The exact ghost-card block this kit inherited. If a reformat ever changes it,
// every unmigrated screen changes with it — so it is pinned here in full.
const LEGACY_CARDS = `
    <div class="skeleton__card">
      <div class="skeleton__bar skeleton__bar--title"></div>
      <div class="skeleton__bar skeleton__bar--wide"></div>
      <div class="skeleton__bar skeleton__bar--narrow"></div>
    </div>
  `;

test("a bare number renders the legacy ghost cards, byte-for-byte", () => {
  const html = skeletonHtml(4);
  assert.ok(html.includes(LEGACY_CARDS.repeat(4)), "four untouched ghost cards");
  assert.ok(!html.includes(LEGACY_CARDS.repeat(5)), "and not a fifth");
  assert.ok(html.includes('class="skeleton sk"'), "on the legacy .skeleton root");
});

test("the default is three cards, through every door", () => {
  const expected = skeletonHtml(3);
  assert.equal(skeletonHtml(), expected, "skeletonHtml default");
  assert.equal(loadingHtml(), expected, "loadingHtml default");
  assert.equal(skeletonFor(), expected, "skeletonFor default");
  assert.equal(skeletonFor({ preset: "cards", rows: 3 }), expected, "explicit preset matches");
});

test("loadingHtml forwards a preset spec unchanged", () => {
  const spec = { preset: "list-rows" as const, rows: 2, toolbar: true };
  assert.equal(loadingHtml(spec), skeletonFor(spec));
});

// --- the root: anti-flash and the announcement -------------------------------

test("every skeleton announces itself and carries the anti-flash class", () => {
  for (const spec of [3, { preset: "list-rows" as const, rows: 2 }]) {
    const html = skeletonFor(spec);
    assert.match(html, /class="[^"]*\bsk\b[^"]*"/, "the .sk anti-flash root");
    assert.ok(html.includes('role="status"'), "announced as a status region");
    assert.ok(html.includes('aria-live="polite"'), "politely");
    assert.ok(html.includes('<span class="sr-only">Loading…</span>'), "with a label");
  }
});

test("the announcement can be worded per screen", () => {
  const html = skeletonFor({ preset: "list-rows", label: "Loading your 1:1s" });
  assert.ok(html.includes('<span class="sr-only">Loading your 1:1s</span>'));
});

test("ghost leaves are hidden from screen readers, so only the label is read", () => {
  const html = skeletonFor({ preset: "list-rows", rows: 2, toolbar: true });
  const leaves = [...html.matchAll(/<span class="[^"]*\bsk-(?:leaf|fill)\b[^"]*"[^>]*>/g)];
  assert.ok(leaves.length > 0, "the preset has ghost leaves");
  for (const m of leaves) {
    assert.ok(m[0].includes('aria-hidden="true"'), `leaf not hidden: ${m[0]}`);
  }
});

// --- inertness ---------------------------------------------------------------
// A skeleton must never be clickable, focusable, or a form control. The real rows
// it mirrors ARE buttons, so this is the easiest mistake to make when adding a preset.

test("no preset ever emits something interactive", () => {
  const specs = [3, { preset: "list-rows" as const, rows: 3, toolbar: true }];
  for (const spec of specs) {
    const html = skeletonFor(spec);
    assert.ok(!/<button/.test(html), "no buttons");
    assert.ok(!/<a\s/.test(html), "no links");
    assert.ok(!/<input/.test(html), "no inputs");
    assert.ok(!/href=/.test(html), "no hrefs");
    assert.ok(!/tabindex=/.test(html), "nothing focusable");
  }
});

// --- spec normalisation ------------------------------------------------------

test("an array of specs stacks them on the standard rhythm", () => {
  const html = skeletonFor([{ preset: "list-rows", rows: 1 }, { preset: "cards", rows: 1 }]);
  assert.ok(html.startsWith('<div class="l-stack l-stack--6">'), "stacked wrapper");
  assert.ok(html.includes("run-list__row"), "the list part");
  assert.ok(html.includes("skeleton__card"), "the cards part");
});

test("an unknown preset falls back to cards rather than rendering nothing", () => {
  const html = skeletonFor({ preset: "not-a-preset" as never, rows: 2 });
  assert.ok(html.includes(LEGACY_CARDS.repeat(2)), "a wrong ghost beats a blank screen");
});

test("an empty array is treated as no spec at all", () => {
  assert.equal(skeletonFor([]), skeletonFor());
});

// --- list-rows ---------------------------------------------------------------

test("list-rows renders one ghost row per row asked for", () => {
  const html = skeletonFor({ preset: "list-rows", rows: 5 });
  assert.equal((html.match(/class="run-list__item"/g) ?? []).length, 5);
  assert.ok(html.includes('class="run-list run-list--card"'), "the card of divider rows");
});

test("list-rows ghosts the toolbar only when asked", () => {
  const withBar = skeletonFor({ preset: "list-rows", toolbar: true });
  assert.ok(withBar.includes('class="list-toolbar"'), "toolbar ghosted");
  const without = skeletonFor({ preset: "list-rows" });
  assert.ok(!without.includes("list-toolbar"), "and omitted otherwise");
});

test("list-rows varies its ghost widths so the list doesn't read as a barcode", () => {
  const html = skeletonFor({ preset: "list-rows", rows: 4 });
  const widths = [...html.matchAll(/--sk-w:([\d.]+ch)/g)].map((m) => m[1]);
  assert.ok(new Set(widths).size > 2, "several different widths");
});

test("ghost leaves carry content, so a row can't collapse shorter than a real one", () => {
  // The whole technique: an empty element has no line box, so an empty ghost row
  // renders shorter than the loaded row and the page jumps when data lands. Every
  // leaf must hold the &nbsp; that builds the real line box.
  const html = skeletonFor({ preset: "list-rows", rows: 1 });
  const leaves = [...html.matchAll(/<span class="[^"]*\bsk-(?:leaf|fill)\b[^"]*"[^>]*>([^<]*)<\/span>/g)];
  assert.equal(leaves.length, 4, "avatar, name, sub and the side badge");
  for (const m of leaves) assert.equal(m[1], "&nbsp;", "every ghost leaf holds the line-box filler");
});

test("a ghost leaf wears the real element's classes, so it inherits the real box", () => {
  // If the ghost were its own element next to the real one, it would inherit none
  // of the real font metrics and the heights would drift.
  const html = skeletonFor({ preset: "list-rows", rows: 1, toolbar: true });
  for (const real of ["run-list__name", "run-list__sub", "run-list__avatar", "list-toolbar__search"]) {
    assert.match(
      html,
      new RegExp(`class="[^"]*\\b${real}\\b[^"]*\\bsk-(?:leaf|fill)\\b`),
      `${real} should be ghosted in place, not wrapped`,
    );
  }
});

// --- structure parity: the guard on reusing real classes ---------------------
// Presets borrow the stages' own layout classes. That is what makes the geometry
// exact, and it is also the one thing that can rot silently: rename .run-list__sub
// in the stage and the ghost quietly goes shapeless in production. So assert that
// every class a preset emits still exists in the screen it mirrors.

const PARITY: { preset: string; src: string; classes: string[] }[] = [
  {
    preset: "list-rows",
    src: "admin/src/stages/runs.ts",
    classes: [
      "run-list",
      "run-list--card",
      "run-list__item",
      "run-list__row",
      "run-list__avatar",
      "run-list__main",
      "run-list__name",
      "run-list__sub",
      "run-list__side",
      "ds-avatar",
      // The star badge, ghosted with its own classes so it keeps the real 14px line box.
      "runs-list__stars",
      "text-sm",
    ],
  },
  {
    preset: "list-rows toolbar",
    src: "admin/src/ui/list-toolbar.ts",
    classes: ["list-toolbar", "list-toolbar__search", "list-toolbar__count"],
  },
  {
    preset: "table",
    src: "admin/src/stages/admin-registered.ts",
    classes: ["um-table-wrap", "um-table", "um-row", "um-actions", "um-actions-th", "um-user__open", "um-user__email"],
  },
  {
    preset: "table badge",
    src: "admin/src/styles/design/admin-tables.css",
    classes: ["um-badge"],
  },
  {
    preset: "table row menu",
    src: "admin/src/styles/row-menu.css",
    classes: ["row-menu-btn"],
  },
  {
    preset: "tiles",
    src: "admin/src/stages/admin-pulse.ts",
    classes: ["lp-tiles", "lp-tile", "lp-tile--hero", "lp-tile__label", "lp-tile__value", "lp-tile__delta", "lp-tile__note"],
  },
  {
    preset: "tiles delta chip",
    src: "admin/src/styles/admin-pulse.css",
    classes: ["lp-delta"],
  },
  {
    preset: "recap",
    src: "admin/src/ui/recap-header.ts",
    classes: ["rd-profile", "rd-profile__id", "rd-avatar", "rd-name", "ds-avatar", "text-sm"],
  },
  {
    preset: "recap tabs",
    src: "admin/src/stages/run-detail.ts",
    classes: ["ds-tabs", "ds-tab"],
  },
  {
    preset: "sections",
    src: "admin/src/ui/screen-scaffold.ts",
    classes: ["card-flat", "eyebrow"],
  },
];

for (const { preset, src, classes } of PARITY) {
  test(`${preset} only borrows classes the real screen still uses (${src})`, () => {
    const source = read(src);
    for (const cls of classes) {
      assert.ok(
        source.includes(cls),
        `the ${preset} preset emits .${cls}, but ${src} no longer renders it. The ghost and the real screen have drifted apart.`,
      );
    }
  });
}

test("every class the presets emit is covered by a parity row", () => {
  // Stops a new preset from borrowing classes nobody is guarding.
  const src = read("admin/src/ui/skeleton-presets.ts");
  const guarded = new Set(PARITY.flatMap((p) => p.classes));
  // The kit's own classes and the shared layout utilities aren't borrowed from a screen.
  const own = /^(sk|sk-leaf|sk-fill|sk-line|sk-table|sk-two-col|skeleton|skeleton__card|skeleton__bar|skeleton__bar--\w+|sr-only|l-stack|l-stack--\d+|space-y-\d+)$/;
  const emitted = new Set<string>();
  for (const m of src.matchAll(/class="([^"$]+)"/g)) {
    for (const cls of m[1]!.split(/\s+/).filter(Boolean)) emitted.add(cls);
  }
  const unguarded = [...emitted].filter((c) => !own.test(c) && !guarded.has(c));
  assert.deepEqual(unguarded, [], "add these to PARITY so a rename can't break them silently");
});
