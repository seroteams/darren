// Guard for the "prefill a run" dev helper. clonable/clone are NOT org-fenced (they
// read finished runs across all companies on disk), so they must never be reachable in
// production — where real tenants exist, that let any admin/manager read another
// company's runs (F-002). prefillAllowed is the one gate; these tests pin it shut in
// production and open only outside it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { prefillAllowed } from "./runs.controller.ts";

test("prefillAllowed is FALSE in production (dev-only helper stays out of prod)", () => {
  assert.equal(prefillAllowed("production"), false);
});

test("prefillAllowed is TRUE in dev / test / unset (QA prefill works locally)", () => {
  assert.equal(prefillAllowed("development"), true);
  assert.equal(prefillAllowed("test"), true);
  assert.equal(prefillAllowed(undefined), true);
  assert.equal(prefillAllowed(""), true);
});
