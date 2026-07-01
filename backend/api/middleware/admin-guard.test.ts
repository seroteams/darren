import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { requireLoginRoute } from "./admin-guard.ts";
import type { IdentityLookup } from "./request-context.ts";
import type { RequestContext } from "../router.ts";

// A bare context carrying just the cookie header (all buildIdentity reads).
function ctxWith(cookie?: string): RequestContext {
  return { req: { headers: cookie ? { cookie } : {} } as IncomingMessage } as RequestContext;
}

const noSession: IdentityLookup = async () => null;
const validSession: IdentityLookup = async (token) =>
  token === "good" ? { userId: "u1", orgId: "o1", roles: ["owner"] } : null;

// Set env for one test and always restore (matches request-context.test.ts).
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

test("requireLoginRoute refuses an anonymous caller (401) and never runs the handler", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    let ran = false;
    const guarded = requireLoginRoute(() => {
      ran = true;
    }, noSession);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith())), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 401);
      return true;
    });
    assert.equal(ran, false, "handler must not run for an anonymous caller");
  });
});

test("requireLoginRoute runs the handler for a logged-in caller", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    let ran = false;
    const guarded = requireLoginRoute(() => {
      ran = true;
    }, validSession);
    await guarded(ctxWith("sero_session=good"));
    assert.equal(ran, true, "handler must run for a logged-in caller");
  });
});

test("requireLoginRoute lets the dev side-door through (non-prod, DEV_AUTOLOGIN)", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: "1" }, async () => {
    let ran = false;
    const guarded = requireLoginRoute(() => {
      ran = true;
    }, noSession);
    await guarded(ctxWith()); // no cookie, but the side-door identifies the caller
    assert.equal(ran, true, "dev one-click must still reach the tool");
  });
});
