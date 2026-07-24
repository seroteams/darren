import { test } from "node:test";
import assert from "node:assert/strict";
import { createSavePip, savePipLabel } from "./save-pip.ts";

// Co-located unit tests run under plain `node --test` (no DOM), so a minimal document
// stub stands in — the factory only touches createElement, dataset, innerHTML,
// setAttribute and querySelector on its own element.

interface FakeLabel {
  textContent: string;
}
interface FakeEl {
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  setAttribute(name: string, value: string): void;
  querySelector(sel: string): FakeLabel | null;
}

function stubDocument(): { el: FakeEl; label: FakeLabel } {
  const label: FakeLabel = { textContent: "" };
  const el: FakeEl = {
    className: "",
    innerHTML: "",
    dataset: {},
    setAttribute() {},
    querySelector: (sel) => (sel === ".save-pip__label" ? label : null),
  };
  (globalThis as { document?: unknown }).document = { createElement: () => el };
  return { el, label };
}

test("savePipLabel maps each state to its copy", () => {
  assert.equal(savePipLabel("idle"), "Saved");
  assert.equal(savePipLabel("saving"), "Saving…");
});

test("createSavePip renders the pip idle, with dot + label markup", () => {
  const { el } = stubDocument();
  const pip = createSavePip();
  assert.equal((pip.el as unknown as FakeEl).className, "save-pip");
  assert.equal(el.dataset.state, "idle");
  assert.ok(el.innerHTML.includes('class="save-pip__dot"'), "dot span");
  assert.ok(el.innerHTML.includes(">Saved<"), "starts as Saved");
});

test("set() flips data-state and the label text, both ways", () => {
  const { el, label } = stubDocument();
  const pip = createSavePip();
  pip.set("saving");
  assert.equal(el.dataset.state, "saving");
  assert.equal(label.textContent, "Saving…");
  pip.set("idle");
  assert.equal(el.dataset.state, "idle");
  assert.equal(label.textContent, "Saved");
});
