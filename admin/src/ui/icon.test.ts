// Icon helper — turns a Lucide IconNode into the app's canonical inline-SVG string.
import test from "node:test";
import assert from "node:assert/strict";
import { House, Menu } from "lucide";
import { icon } from "./icon.js";

test("icon() renders a Lucide node as an inline SVG string", () => {
  const svg = icon(Menu);
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /stroke="currentColor"/);
  // Menu is three <path> lines — the children come straight from Lucide's data.
  assert.equal((svg.match(/<path /g) || []).length, 3);
});

test("icon() is aria-hidden by default, exposes a label when asked", () => {
  assert.match(icon(House), /aria-hidden="true"/);
  const labelled = icon(House, { label: "Home" });
  assert.match(labelled, /role="img"/);
  assert.match(labelled, /aria-label="Home"/);
  assert.doesNotMatch(labelled, /aria-hidden/);
});

test("icon() honours size and merges a custom class", () => {
  const svg = icon(House, { size: 32, className: "big" });
  assert.match(svg, /width="32"/);
  assert.match(svg, /height="32"/);
  assert.match(svg, /class="sero-icon big"/);
});
