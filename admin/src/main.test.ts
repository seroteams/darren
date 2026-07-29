import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// main.js runs boot()/startPopstate() as a side effect of import (real fetches, real DOM),
// so this guard reads the source instead of importing — same approach as
// auth-screens.test.ts / questioning-ready.test.ts. It locks the audit-fixes-jul-25 Phase 3
// fix: an admin/owner's /runs/:id survives a refresh, a Back, and a pasted link. The member
// path already carried myRunId before this fix — only the admin/owner path was missing it.

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "main.js"), "utf8");

test("boot carries myRunId for the admin/owner path's /runs/:id, mirroring the member branch", () => {
  const memberBranch = /if \(route && route\.stage === STAGES\.RUN_DETAIL\) \{\s*\n\s*if \(route\.params\?\.myRunId\) \{ setState\(\{ myRunId: route\.params\.myRunId, stage: STAGES\.RUN_DETAIL \}\); return; \}/;
  const ownerBranch = /if \(route\?\.stage === STAGES\.RUN_DETAIL\) \{\s*\n\s*if \(route\.params\?\.myRunId\) \{ setState\(\{ myRunId: route\.params\.myRunId, stage: STAGES\.RUN_DETAIL \}\); return; \}/;
  assert.match(SRC, memberBranch, "the pre-existing member handler stays");
  assert.match(SRC, ownerBranch, "the new admin/owner handler carries the same id");
});

test("the owner RUN_DETAIL branch sits before the generic standalone-path fallback", () => {
  const ownerMatch = /if \(route\?\.stage === STAGES\.RUN_DETAIL\) \{\s*\n\s*if \(route\.params\?\.myRunId\)/.exec(SRC);
  const fallbackAt = SRC.indexOf("Explicit standalone path wins over a non-flow default");
  assert.ok(ownerMatch && fallbackAt > -1, "both present");
  assert.ok(ownerMatch.index < fallbackAt, "the specific handler runs before the generic one drops the id");
});

test("a bad or missing run id for the owner path lands on the runs list via replaceUrl", () => {
  assert.match(SRC, /replaceUrl\("\/runs"\); setState\(\{ stage: STAGES\.RUNS \}\); return;/);
});

test("popstate on RUN_DETAIL bumps stageTick so Back between two runs actually remounts", () => {
  assert.match(
    SRC,
    /setState\(\{ myRunId: parsed\.params\.myRunId, stage: STAGES\.RUN_DETAIL, stageTick: store\.stageTick \+ 1 \}\)/,
  );
});
