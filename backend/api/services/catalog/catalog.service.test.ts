import { test } from "node:test";
import assert from "node:assert/strict";
import { MEETING_TYPES } from "../../../engine/meeting-types.ts";
import { createCatalogService, HIDDEN_FROM_PICKER } from "./catalog.service.ts";
import type { CatalogRepo } from "./catalog.repo.ts";

// An in-memory repo proves the service logic is storage-agnostic: swap the file
// repo for this fake and the service is untouched (the Phase 004 seam check).
const t0 = MEETING_TYPES[0]?.label ?? "";
const t1 = MEETING_TYPES[1]?.label ?? "";
const tLast = MEETING_TYPES[MEETING_TYPES.length - 1]?.label ?? "";

// What the picker shows: the engine list minus the hidden Onboarding entry. Onboarding is
// LAST in MEETING_TYPES, so interview indices 0..n-1 still line up with the engine
// (meetingTypeIndex is a positional wire contract).
const PICKER_LABELS = MEETING_TYPES.filter((t) => t.label !== HIDDEN_FROM_PICKER).map(
  (t) => t.label
);

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

test("listMeetingTypes hides Onboarding from the picker and keeps engine order", () => {
  const service = createCatalogService(fakeRepo());
  const types = service.listMeetingTypes();
  assert.equal(HIDDEN_FROM_PICKER, "Onboarding check-in");
  assert.equal(types.length, MEETING_TYPES.length - 1);
  assert.ok(types.every((t) => t.kind === "interview"));
  assert.ok(!types.some((t) => t.label === HIDDEN_FROM_PICKER));
  // same labels, same order as the engine (the positional wire contract is preserved —
  // Onboarding is the LAST engine entry, so indices 0..n-1 stay engine-aligned)
  assert.deepEqual(
    types.map((t) => t.label),
    PICKER_LABELS
  );
  assert.ok(!types.some((t) => t.kind === "guided"));
});

test("hidden entry is the last engine entry — dropping it can't shift picker indices", () => {
  assert.equal(MEETING_TYPES[MEETING_TYPES.length - 1]?.label, HIDDEN_FROM_PICKER);
});

test("listMeetingTypes appends the guided Monthly Check-in card when guided is on", () => {
  const service = createCatalogService(fakeRepo());
  const withGuided = service.listMeetingTypes({ guided: true });
  assert.equal(withGuided.length, PICKER_LABELS.length + 1);
  const guided = withGuided[withGuided.length - 1];
  assert.equal(guided?.label, "Monthly Check-in");
  assert.equal(guided?.kind, "guided");
  // appended LAST so interview indices never shift (meetingTypeIndex is positional)
  assert.deepEqual(
    withGuided.slice(0, PICKER_LABELS.length).map((t) => t.label),
    PICKER_LABELS
  );
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

test("listPersonas indexes against the UNFILTERED engine list, not the picker copy", () => {
  // Prefill indices are interpreted against engine MEETING_TYPES by sessions.service, so a
  // persona on the hidden (last) engine type must keep its engine index — the picker filter
  // must never leak into persona indexing.
  const repo: CatalogRepo = {
    getMeetingTypes: () => MEETING_TYPES,
    getPersonas: () => [{ id: "h", order: 1, meeting_type: tLast }],
  };
  const [p] = createCatalogService(repo).listPersonas();
  assert.equal(p?.meetingTypeIndex, MEETING_TYPES.length - 1);
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
