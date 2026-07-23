import { test } from "node:test";
import assert from "node:assert/strict";
import { wizardFooter } from "./wizard-footer.ts";

// The one wizard footer for every flow step (design-consolidation Phase 3):
// ghost Back bottom-left, primary bottom-right, optional quiet note beside the
// primary. Pure string render; hosts wire js-wf-back / js-wf-continue.

test("primary sits right with its hook; Back is a ghost on the left", () => {
  const html = wizardFooter({ back: {}, primary: { label: "Continue" } });
  assert.ok(html.includes('class="wizard-footer"'), "footer wrapper");
  assert.match(html, /wizard-footer__left[\s\S]*js-wf-back/, "back in the left slot");
  assert.match(html, /class="btn btn--ghost js-wf-back"/, "back is a ghost");
  assert.match(html, /wizard-footer__right[\s\S]*js-wf-continue/, "primary in the right slot");
  assert.ok(html.indexOf("js-wf-back") < html.indexOf("js-wf-continue"), "back before primary");
  assert.ok(html.includes(">Continue<"), "primary label");
});

test("no Back slot content when back is omitted; layout wrapper still present", () => {
  const html = wizardFooter({ primary: { label: "Continue" } });
  assert.ok(!html.includes("js-wf-back"), "no back button");
  assert.ok(html.includes("wizard-footer__left"), "left slot keeps the layout balanced");
});

test("a note renders quietly beside the primary", () => {
  const html = wizardFooter({ primary: { label: "Continue" }, note: "2 selected" });
  assert.match(html, /wizard-footer__note[^>]*>2 selected</, "note rendered");
  assert.ok(html.indexOf("2 selected") < html.indexOf("js-wf-continue"), "note before the button");
});

test("disabled primary carries the attribute", () => {
  const html = wizardFooter({ primary: { label: "Continue", disabled: true } });
  assert.match(html, /js-wf-continue[^>]*\bdisabled\b/, "disabled attribute present");
});

test("escapes labels and note; secondaryHtml is trusted markup", () => {
  const html = wizardFooter({
    back: { label: "<b>b</b>" },
    note: "<i>n</i>",
    primary: { label: "<u>p</u>" },
    secondaryHtml: "<button>ok</button>",
  });
  assert.ok(!html.includes("<b>b</b>") && !html.includes("<i>n</i>") && !html.includes("<u>p</u>"), "escaped");
  assert.ok(html.includes("<button>ok</button>"), "secondary passed through");
});
