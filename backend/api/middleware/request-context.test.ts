import { test } from "node:test";
import assert from "node:assert/strict";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { anonymousIdentity, buildIdentity } from "./request-context.ts";
import { requireAuth } from "./require-auth.ts";

test("anonymousIdentity is fully anonymous", () => {
  assert.deepEqual(anonymousIdentity(), { userId: null, orgId: null, roles: [] });
});

test("buildIdentity is anonymous regardless of request headers (no auth yet)", () => {
  const req = new IncomingMessage(new Socket());
  req.headers.authorization = "Bearer whatever";
  // Phase 004 has no auth: identity is the SHAPE the Phase 006 login check fills in.
  assert.deepEqual(buildIdentity(req), { userId: null, orgId: null, roles: [] });
});

test("requireAuth is a no-op slot in Phase 004 (never rejects)", () => {
  assert.doesNotThrow(() => requireAuth(anonymousIdentity()));
});
