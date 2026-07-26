// Unit tests for the one button renderer (component-consolidation P3).
//
// The point of these is byte-exactness. This phase claims "no visual change", and the only
// way that claim holds across ~170 swapped call sites is if button() emits the SAME class
// string the hand-typed markup did, in the same order. So the tests below assert whole
// strings, not substrings.

import { test } from "node:test";
import assert from "node:assert/strict";
import { button } from "./button.ts";

test("the default is the one solid accent action, and it emits bare .btn", () => {
  // Bare `.btn` is the medium default in the CSS. It must NOT gain a size class.
  assert.equal(button({ label: "Start 1:1" }), `<button type="button" class="btn">Start 1:1</button>`);
});

test("ghost and danger match the class strings already in the markup", () => {
  assert.equal(button({ label: "Back", variant: "ghost" }), `<button type="button" class="btn btn--ghost">Back</button>`);
  assert.equal(button({ label: "Delete", variant: "danger" }), `<button type="button" class="btn btn--danger">Delete</button>`);
});

test("classes come out in one fixed order: btn, variant, size, extra, hook", () => {
  assert.equal(
    button({ label: "x", variant: "ghost", size: "sm", extraClass: "notes-panel__close", hook: "js-close" }),
    `<button type="button" class="btn btn--ghost btn--sm notes-panel__close js-close">x</button>`,
  );
});

test("the js- hook lands in the class list, where the mount code looks for it", () => {
  assert.equal(button({ label: "Save", hook: "js-submit" }), `<button type="button" class="btn js-submit">Save</button>`);
  assert.equal(
    button({ label: "Try again", variant: "ghost", hook: "js-retry" }),
    `<button type="button" class="btn btn--ghost js-retry">Try again</button>`,
  );
});

test("several hooks are allowed, space-separated", () => {
  assert.equal(
    button({ label: "x", variant: "ghost", hook: "js-a js-b" }),
    `<button type="button" class="btn btn--ghost js-a js-b">x</button>`,
  );
});

test("type=submit is opt-in; everything defaults to button so no form submits by accident", () => {
  assert.equal(button({ label: "Go", type: "submit" }), `<button type="submit" class="btn">Go</button>`);
});

test("disabled renders the bare attribute the CSS selector expects", () => {
  // The CSS is .btn[disabled], not .btn:disabled — a `disabled="false"` string would match it.
  assert.equal(button({ label: "Saving", disabled: true }), `<button type="button" class="btn" disabled>Saving</button>`);
  assert.ok(!button({ label: "Saving", disabled: false }).includes("disabled"));
});

test("the label is escaped, so a person's own name can never inject markup", () => {
  assert.equal(
    button({ label: `Delete <img src=x onerror=alert(1)>` }),
    `<button type="button" class="btn">Delete &lt;img src=x onerror=alert(1)&gt;</button>`,
  );
});

test("labelHtml is the opt-out for a label that genuinely carries markup", () => {
  assert.equal(
    button({ labelHtml: `<span class="js-btn-label">Copy</span>`, variant: "ghost" }),
    `<button type="button" class="btn btn--ghost"><span class="js-btn-label">Copy</span></button>`,
  );
});

test("an icon sits before the label, not instead of it", () => {
  assert.equal(
    button({ iconLeft: "<svg/>", label: "More", variant: "ghost" }),
    `<button type="button" class="btn btn--ghost"><svg/>More</button>`,
  );
});

test("an icon-only button can still name itself for a screen reader", () => {
  assert.equal(
    button({ iconLeft: "<svg/>", ariaLabel: "More actions", variant: "ghost", hook: "js-menu" }),
    `<button type="button" class="btn btn--ghost js-menu" aria-label="More actions"><svg/></button>`,
  );
});

test("extra attributes are escaped, and falsy ones are dropped rather than rendered empty", () => {
  assert.equal(
    button({ label: "Open", attrs: { "data-id": `a"b`, "aria-pressed": "false", id: null, hidden: false } }),
    `<button type="button" class="btn" data-id="a&quot;b" aria-pressed="false">Open</button>`,
  );
});

test("a true attribute renders bare, the way the guided flow's markers are written", () => {
  assert.equal(
    button({ label: "Continue to Review", attrs: { "data-next": true } }),
    `<button type="button" class="btn" data-next>Continue to Review</button>`,
  );
});

test("attribute order is stable: disabled, aria-label, title, then the rest", () => {
  assert.equal(
    button({ label: "x", disabled: true, ariaLabel: "A", title: "T", attrs: { "data-k": "v" } }),
    `<button type="button" class="btn" disabled aria-label="A" title="T" data-k="v">x</button>`,
  );
});

test("no label renders an empty button rather than the string undefined", () => {
  assert.equal(button({}), `<button type="button" class="btn"></button>`);
});
