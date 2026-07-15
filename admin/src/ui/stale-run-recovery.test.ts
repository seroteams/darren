import { test } from "node:test";
import assert from "node:assert/strict";
import { staleRunRecoveryHtml } from "./stale-run-recovery.ts";

// When a Resume fails (the session expired or was cleared server-side) the row must heal in
// place — no native alert(), and no dead Resume button left offering a dead end. (audit M3/X7)
// Pure render, so we assert on the markup.

test("recovery card offers a start-fresh action named for the person", () => {
  const html = staleRunRecoveryHtml("Priya");
  assert.ok(html.includes("Start fresh with Priya"), "names the person");
  assert.ok(html.includes("js-start-fresh"), "wires a start-fresh control");
});

test("recovery card never leaves a Resume affordance", () => {
  assert.ok(!staleRunRecoveryHtml("Priya").includes("js-resume"), "the dead Resume is gone");
});

test("no name still gives a usable start-fresh action", () => {
  assert.ok(staleRunRecoveryHtml("").includes("Start a new 1:1"), "generic fallback label");
});

test("the person name is escaped", () => {
  assert.ok(staleRunRecoveryHtml("<b>x</b>").includes("&lt;b&gt;"), "no raw HTML injected");
});
