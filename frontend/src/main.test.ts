import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// main.js runs boot()/startPopstate() as a side effect of import (real fetches, real DOM),
// so this guard reads the source instead of importing — same approach as
// auth-screens.test.ts / questioning-ready.test.ts. It locks the audit-fixes-jul-25 Phase 3
// fix: a manager's /runs/:id survives a refresh, a Back, and a pasted link.

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "main.js"), "utf8");

test("boot carries myRunId for a manager's /runs/:id deep link, not just the stage", () => {
  assert.match(
    SRC,
    /route\?\.stage === STAGES\.RUN_DETAIL\) \{\s*\n\s*if \(route\.params\?\.myRunId\) \{ setState\(\{ myRunId: route\.params\.myRunId, stage: STAGES\.RUN_DETAIL \}\); return; \}/,
    "boot's manager path sets myRunId from the URL, mirroring the /team/:person handler",
  );
});

test("boot's RUN_DETAIL branch sits before the generic standalone-path fallback", () => {
  const runDetailMatch = /if \(route\?\.stage === STAGES\.RUN_DETAIL\) \{\s*\n\s*if \(route\.params\?\.myRunId\)/.exec(SRC);
  const fallbackAt = SRC.indexOf("Explicit standalone path wins over a non-flow default");
  assert.ok(runDetailMatch && fallbackAt > -1, "both present");
  assert.ok(runDetailMatch.index < fallbackAt, "the specific handler runs before the generic one drops the id");
});

test("a bad or missing run id in boot lands on the runs list, never a raw crash", () => {
  assert.match(
    SRC,
    /history\.replaceState\(null, "", "\/runs"\); setState\(\{ stage: STAGES\.RUNS \}\); return;/,
  );
});

test("popstate on RUN_DETAIL bumps stageTick so Back between two runs actually remounts", () => {
  // Without this, going Back from run B straight to run A keeps stage === RUN_DETAIL, so the
  // shell's render gate (stage !== routedStage || stageTick !== routedTick) sees nothing new
  // and never re-mounts — the screen keeps showing whichever run last rendered.
  assert.match(
    SRC,
    /setState\(\{ myRunId: parsed\.params\.myRunId, stage: STAGES\.RUN_DETAIL, stageTick: store\.stageTick \+ 1 \}\)/,
  );
});
