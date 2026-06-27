import { test } from "node:test";
import assert from "node:assert/strict";
import { MEETING_TYPES } from "../../../engine/meeting-types.ts";
import { createCatalogService } from "./catalog.service.ts";
import type { CatalogRepo } from "./catalog.repo.ts";

// An in-memory repo proves the service logic is storage-agnostic: swap the file
// repo for this fake and the service is untouched (the Phase 004 seam check).
const t0 = MEETING_TYPES[0]?.label ?? "";
const t1 = MEETING_TYPES[1]?.label ?? "";

function fakeRepo(): CatalogRepo {
  return {
    getMeetingTypes: () => MEETING_TYPES,
    getPersonas: () => [
      { id: "b", order: 2, meeting_type: t1 },
      { id: "a", order: 1, meeting_type: t0 },
      { id: "x", order: 3, meeting_type: "No Such Type" },
    ],
  };
}

test("listMeetingTypes returns the repo's meeting types unchanged", () => {
  const service = createCatalogService(fakeRepo());
  assert.deepEqual(service.listMeetingTypes(), MEETING_TYPES);
});

test("listPersonas sorts by order ascending", () => {
  const service = createCatalogService(fakeRepo());
  assert.deepEqual(
    service.listPersonas().map((p) => p.id),
    ["a", "b", "x"]
  );
});

test("listPersonas injects meetingTypeIndex (and -1 for an unknown type)", () => {
  const service = createCatalogService(fakeRepo());
  const byId = new Map(service.listPersonas().map((p) => [p.id, p.meetingTypeIndex]));
  assert.equal(byId.get("a"), 0);
  assert.equal(byId.get("b"), 1);
  assert.equal(byId.get("x"), -1);
});

test("listPersonas does not mutate the repo's array", () => {
  // The file repo caches and returns ONE array, so the service must not sort it
  // in place. A stable reference here catches an in-place sort.
  const personas = [
    { id: "b", order: 2, meeting_type: t1 },
    { id: "a", order: 1, meeting_type: t0 },
  ];
  const repo: CatalogRepo = { getMeetingTypes: () => MEETING_TYPES, getPersonas: () => personas };
  createCatalogService(repo).listPersonas();
  assert.deepEqual(personas.map((p) => p.id), ["b", "a"]);
});
