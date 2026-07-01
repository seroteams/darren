import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { requireAdminRoute } from "./admin-guard.ts";
import { requireAdmin } from "./require-auth.ts";
import type { IdentityLookup } from "./request-context.ts";
import type { RequestContext } from "../router.ts";

// A bare context carrying just the cookie header (all buildIdentity reads).
function ctxWith(cookie?: string): RequestContext {
  return { req: { headers: cookie ? { cookie } : {} } as IncomingMessage } as RequestContext;
}

const noSession: IdentityLookup = async () => null;
const ownerSession: IdentityLookup = async (token) =>
  token === "owner" ? { userId: "u1", orgId: "o1", roles: ["owner"] } : null;
const memberSession: IdentityLookup = async (token) =>
  token === "member" ? { userId: "u2", orgId: "o1", roles: ["member"] } : null;

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

// --- requireAdmin (the pure gate) ---

test("requireAdmin: anonymous → 401", () => {
  assert.throws(() => requireAdmin({ userId: null, orgId: null, roles: [] }), (err: unknown) => {
    assert.equal((err as { status?: number }).status, 401);
    return true;
  });
});

test("requireAdmin: logged-in member → 403", () => {
  assert.throws(() => requireAdmin({ userId: "u2", orgId: "o1", roles: ["member"] }), (err: unknown) => {
    assert.equal((err as { status?: number }).status, 403);
    return true;
  });
});

test("requireAdmin: owner and admin are allowed", () => {
  assert.doesNotThrow(() => requireAdmin({ userId: "u1", orgId: "o1", roles: ["owner"] }));
  assert.doesNotThrow(() => requireAdmin({ userId: "u3", orgId: "o1", roles: ["admin"] }));
});

// --- requireAdminRoute (the route wrapper over buildIdentity) ---

test("requireAdminRoute refuses an anonymous caller (401) and never runs the handler", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    let ran = false;
    const guarded = requireAdminRoute(() => {
      ran = true;
    }, noSession);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith())), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 401);
      return true;
    });
    assert.equal(ran, false, "handler must not run for an anonymous caller");
  });
});

test("requireAdminRoute refuses a logged-in member (403) and never runs the handler", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    let ran = false;
    const guarded = requireAdminRoute(() => {
      ran = true;
    }, memberSession);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith("sero_session=member"))), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      return true;
    });
    assert.equal(ran, false, "handler must not run for a non-admin member");
  });
});

test("requireAdminRoute runs the handler for a logged-in owner", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined }, async () => {
    let ran = false;
    const guarded = requireAdminRoute(() => {
      ran = true;
    }, ownerSession);
    await guarded(ctxWith("sero_session=owner"));
    assert.equal(ran, true, "handler must run for an owner");
  });
});

test("requireAdminRoute lets the dev side-door through (non-prod, DEV_AUTOLOGIN → owner)", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: "1" }, async () => {
    let ran = false;
    const guarded = requireAdminRoute(() => {
      ran = true;
    }, noSession);
    await guarded(ctxWith()); // no cookie, but the side-door identifies an owner
    assert.equal(ran, true, "dev one-click must still reach the tool");
  });
});
