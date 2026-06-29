import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { anonymousIdentity, buildIdentity } from "./request-context.ts";
import type { IdentityLookup } from "./request-context.ts";
import { requireAuth } from "./require-auth.ts";

// A bare request carrying just the cookie header (all buildIdentity reads).
function reqWith(cookie?: string): IncomingMessage {
  return { headers: cookie ? { cookie } : {} } as IncomingMessage;
}

const noSession: IdentityLookup = async () => null;

// Set env for the duration of one test and always restore (delete when it was unset).
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) prev[k] = process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("anonymousIdentity is fully anonymous", () => {
  assert.deepEqual(anonymousIdentity(), { userId: null, orgId: null, roles: [] });
});

test("buildIdentity is anonymous with no cookie (no dev flag)", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    assert.deepEqual(await buildIdentity(reqWith(), noSession), { userId: null, orgId: null, roles: [] });
  });
});

test("buildIdentity returns the looked-up identity for a valid session cookie", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    const lookup: IdentityLookup = async (token) =>
      token === "good" ? { userId: "u1", orgId: "o1", roles: ["owner"] } : null;
    assert.deepEqual(await buildIdentity(reqWith("sero_session=good"), lookup), {
      userId: "u1",
      orgId: "o1",
      roles: ["owner"],
    });
  });
});

test("buildIdentity is anonymous when the cookie's session is unknown or expired", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    const id = await buildIdentity(reqWith("sero_session=stale"), noSession);
    assert.equal(id.userId, null);
  });
});

test("dev side-door: with DEV_AUTOLOGIN set (non-prod) you are auto-identified with no cookie", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: "1" }, async () => {
    const id = await buildIdentity(reqWith(), noSession);
    assert.notEqual(id.userId, null);
  });
});

test("HARD GATE: the dev side-door is dead in production even with DEV_AUTOLOGIN set", async () => {
  await withEnv({ NODE_ENV: "production", DEV_AUTOLOGIN: "1" }, async () => {
    const id = await buildIdentity(reqWith(), noSession);
    assert.deepEqual(id, { userId: null, orgId: null, roles: [] });
  });
});

test("requireAuth rejects an anonymous identity", () => {
  assert.throws(() => requireAuth(anonymousIdentity()), /signed in|auth/i);
});

test("requireAuth allows an identified user", () => {
  assert.doesNotThrow(() => requireAuth({ userId: "u1", orgId: "o1", roles: ["owner"] }));
});
