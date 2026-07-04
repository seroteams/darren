import test from "node:test";
import assert from "node:assert/strict";
import { fillPlaceholders, splitSystemUser } from "./prompt-utils.ts";

test("fillPlaceholders: fills every occurrence of each key", () => {
  const out = fillPlaceholders("hi {{NAME}}, yes {{NAME}} ({{ROLE}})", {
    NAME: "Priya",
    ROLE: "Engineer",
  });
  assert.equal(out, "hi Priya, yes Priya (Engineer)");
});

test("fillPlaceholders: unknown placeholders are left untouched", () => {
  const out = fillPlaceholders("{{KNOWN}} and {{UNKNOWN}}", { KNOWN: "x" });
  assert.equal(out, "x and {{UNKNOWN}}");
});

test("fillPlaceholders: applies vars in insertion order, sequentially", () => {
  // Matches the old chained-replaceAll semantics exactly: a value inserted by an
  // earlier key IS scanned by later keys. Do not "fix" this — byte-identical
  // prompts beat elegance here.
  const out = fillPlaceholders("{{A}}", { A: "see {{B}}", B: "b!" });
  assert.equal(out, "see b!");
});

test("splitSystemUser: still splits a filled template", () => {
  const s = splitSystemUser("## System\nsys here\n## User\nuser here");
  assert.equal(s.system, "sys here");
  assert.equal(s.user, "user here");
});
