// Role-profile cache semantics (postgres-runtime-data Phase 5), DB-less via the
// injectable loaders. The one that matters most: a cached profile HIT after the
// cutover — the self-migrated disk doc answers, so no regeneration (no LLM
// spend) is ever triggered by moving stores.

import test from "node:test";
import assert from "node:assert/strict";
import {
  hydrateRoleProfiles,
  resetRoleProfiles,
  roleProfileGet,
  roleProfileHas,
  roleProfileList,
  roleProfileOverlayGet,
  roleProfileSaveDoc,
  roleProfileSaveOverlay,
  isRoleProfilesHydrated,
} from "./role-profiles-store.ts";

const DOC = { version: 1, profile: { summary: "s" } };

test("hydration: DB rows win, disk-only entries self-migrate (cache hit — no regeneration)", async () => {
  resetRoleProfiles();
  await hydrateRoleProfiles("unused", {
    loadRows: async () => [{ cacheKey: "pm--senior", doc: { ...DOC, from: "db" }, overlay: { hidden_terms: ["x"] } }],
    diskEntries: () =>
      new Map([
        ["pm--senior", { doc: { ...DOC, from: "stale disk" }, overlay: null }],
        ["eng--junior", { doc: { ...DOC, from: "disk only" }, overlay: { added_terms: [] } }],
      ]),
  });
  assert.equal((roleProfileGet("pm--senior") as { from?: string }).from, "db");
  assert.equal((roleProfileGet("eng--junior") as { from?: string }).from, "disk only");
  assert.equal(roleProfileHas("eng--junior"), true, "self-migrated profile is a cache HIT");
  assert.deepEqual(roleProfileOverlayGet("pm--senior"), { hidden_terms: ["x"] });
  assert.equal(roleProfileGet("unknown--role"), null);
});

test("save doc preserves the overlay; overlay save requires the profile", async () => {
  resetRoleProfiles();
  await hydrateRoleProfiles("unused", { loadRows: async () => [], diskEntries: () => new Map() });
  roleProfileSaveDoc("pm--senior", DOC);
  roleProfileSaveOverlay("pm--senior", { added_terms: [{ term: "OKR" }] });
  roleProfileSaveDoc("pm--senior", { ...DOC, regenerated: true });
  assert.deepEqual(roleProfileOverlayGet("pm--senior"), { added_terms: [{ term: "OKR" }] });
  assert.throws(() => roleProfileSaveOverlay("nobody--here", {}), /Unknown role/);
});

test("list is sorted by key", async () => {
  resetRoleProfiles();
  await hydrateRoleProfiles("unused", {
    loadRows: async () => [
      { cacheKey: "z--z", doc: DOC, overlay: null },
      { cacheKey: "a--a", doc: DOC, overlay: null },
    ],
    diskEntries: () => new Map(),
  });
  assert.deepEqual(roleProfileList().map((e) => e.key), ["a--a", "z--z"]);
});

test("reads before hydration fail loudly", () => {
  resetRoleProfiles();
  assert.equal(isRoleProfilesHydrated(), false);
  assert.throws(() => roleProfileGet("pm--senior"), /hydrateRoleProfiles/);
});
