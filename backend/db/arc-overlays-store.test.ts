// Arc-overlay cache semantics (postgres-runtime-data Phase 5), DB-less via the
// injectable loaders: DB rows win over disk, disk-only overlays self-migrate,
// reads before hydration fail loudly, remove clears the cache.

import test from "node:test";
import assert from "node:assert/strict";
import {
  hydrateArcOverlays,
  resetArcOverlays,
  arcOverlayGet,
  arcOverlaySave,
  arcOverlayRemove,
  isArcOverlaysHydrated,
} from "./arc-overlays-store.ts";

test("hydration merges DB rows (winning) with disk-only overlays (self-migrated)", async () => {
  resetArcOverlays();
  await hydrateArcOverlays("unused", {
    loadRows: async () => [{ key: "bi_weekly_check_in", doc: { version: 1, tone_register: "db copy" } }],
    diskDocs: () =>
      new Map([
        ["bi_weekly_check_in", { version: 1, tone_register: "stale disk copy" }],
        ["something_feels_off", { version: 1, tone_register: "disk only — migrates" }],
      ]),
  });
  assert.equal(arcOverlayGet("bi_weekly_check_in")?.tone_register, "db copy");
  assert.equal(arcOverlayGet("something_feels_off")?.tone_register, "disk only — migrates");
  assert.equal(arcOverlayGet("growth_career"), null);
});

test("save and remove update the cache", async () => {
  resetArcOverlays();
  await hydrateArcOverlays("unused", { loadRows: async () => [], diskDocs: () => new Map() });
  arcOverlaySave("growth_career", { version: 1, tone_register: "warm" });
  assert.equal(arcOverlayGet("growth_career")?.tone_register, "warm");
  assert.equal(arcOverlayRemove("growth_career"), true);
  assert.equal(arcOverlayGet("growth_career"), null);
  assert.equal(arcOverlayRemove("growth_career"), false);
});

test("reads before hydration fail loudly", () => {
  resetArcOverlays();
  assert.equal(isArcOverlaysHydrated(), false);
  assert.throws(() => arcOverlayGet("bi_weekly_check_in"), /hydrateArcOverlays/);
});
