import { test } from "node:test";
import assert from "node:assert/strict";
import { identityColumns } from "./feedback.repo.ts";

// feedback_notes.org_id / user_id are uuid columns. A synthetic dev identity
// (DEV_AUTOLOGIN) carries non-uuid ids like "dev-org" / "dev-user", so an unguarded
// write throws "invalid input syntax for type uuid" — every local briefing verdict tap
// 500'd and the note was lost. Unlike a read, we must NOT short-circuit: the note is the
// point. Store the note with a null author instead — the reads already LEFT JOIN, so a
// null author lists as "no name / no company", which is honest.
const UUID = "3f1a9c8e-2b4d-4a7f-8c1e-5d6b7a8c9e0f";
const OTHER = "9e0f5d6b-7a8c-4a7f-8c1e-3f1a9c8e2b4d";

test("identityColumns: a non-uuid dev identity is stored as null, not as a broken reference", () => {
  assert.deepEqual(identityColumns({ orgId: "dev-org", userId: "dev-user" }), { orgId: null, userId: null });
});

test("identityColumns: real uuids pass straight through", () => {
  assert.deepEqual(identityColumns({ orgId: UUID, userId: OTHER }), { orgId: UUID, userId: OTHER });
});

test("identityColumns: a real org with a dev user keeps the org and drops only the user", () => {
  assert.deepEqual(identityColumns({ orgId: UUID, userId: "dev-user" }), { orgId: UUID, userId: null });
});

test("identityColumns: already-null ids stay null", () => {
  assert.deepEqual(identityColumns({ orgId: null, userId: null }), { orgId: null, userId: null });
});
