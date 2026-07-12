import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { requireInternalToolRoute, blockOnLive } from "./internal-tool-guard.ts";
import type { IdentityLookup } from "./request-context.ts";
import type { RequestContext } from "../router.ts";

function ctxWith(cookie?: string): RequestContext {
  return {
    req: { headers: cookie ? { cookie } : {}, method: "GET" } as IncomingMessage,
    url: new URL("http://localhost/api/v1/role-lexicons"),
    query: {},
    params: {},
  } as RequestContext;
}

const noAudit = async () => {};
const SUPER = "carl@seroteams.com";

const noSession: IdentityLookup = async () => null;
const managerSession: IdentityLookup = async (token) =>
  token === "manager" ? { userId: "u2", orgId: "o2", roles: ["manager"], email: "someone@acme.com", name: "Owner" } : null;
const superSession: IdentityLookup = async (token) =>
  token === "super" ? { userId: "u1", orgId: "o1", roles: ["manager"], email: SUPER, name: "Carl" } : null;

// Set env for one test and always restore (matches superadmin-guard.test.ts).
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

const BASE_ENV = { NODE_ENV: "development", DEV_AUTOLOGIN: undefined, SUPERADMIN_EMAILS: SUPER };

// --- requireInternalToolRoute: local keeps today's manager/admin gate ---

test("internal-tool guard, local: a logged-in manager passes (today's behavior, unchanged)", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "local" }, async () => {
    let ran = false;
    const guarded = requireInternalToolRoute(() => {
      ran = true;
    }, managerSession, noAudit);
    await guarded(ctxWith("sero_session=manager"));
    assert.equal(ran, true, "a manager must still reach internal tools locally");
  });
});

test("internal-tool guard, local: anonymous is still 401", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "local" }, async () => {
    let ran = false;
    const guarded = requireInternalToolRoute(() => {
      ran = true;
    }, noSession, noAudit);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith())), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 401);
      return true;
    });
    assert.equal(ran, false);
  });
});

// --- requireInternalToolRoute: live tightens to superadmin only ---

test("internal-tool guard, live: a plain manager is refused (403)", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "live" }, async () => {
    let ran = false;
    const guarded = requireInternalToolRoute(() => {
      ran = true;
    }, managerSession, noAudit);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith("sero_session=manager"))), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      return true;
    });
    assert.equal(ran, false, "a live customer must never reach internal tools");
  });
});

test("internal-tool guard, live: the allowlisted superadmin passes", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "live" }, async () => {
    let ran = false;
    const guarded = requireInternalToolRoute(() => {
      ran = true;
    }, superSession, noAudit);
    await guarded(ctxWith("sero_session=super"));
    assert.equal(ran, true);
  });
});

test("internal-tool guard reads APP_ENV per request, not at wrap time", async () => {
  let ran = 0;
  const guarded = requireInternalToolRoute(() => {
    ran += 1;
  }, managerSession, noAudit);
  await withEnv({ ...BASE_ENV, APP_ENV: "local" }, async () => {
    await guarded(ctxWith("sero_session=manager"));
  });
  assert.equal(ran, 1);
  await withEnv({ ...BASE_ENV, APP_ENV: "live" }, async () => {
    await assert.rejects(() => Promise.resolve(guarded(ctxWith("sero_session=manager"))));
  });
  assert.equal(ran, 1, "the same wrapped route must tighten when the env says live");
});

// --- blockOnLive: the paid persona-runs endpoint is off on live, for everyone ---

test("blockOnLive, live: 403 even for the superadmin (paid endpoint stays shut)", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "live" }, async () => {
    let ran = false;
    const guarded = blockOnLive("Test engine is off on the live site", () => {
      ran = true;
    });
    await assert.rejects(() => Promise.resolve(guarded(ctxWith("sero_session=super"))), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      assert.match(String((err as Error).message), /live site/);
      return true;
    });
    assert.equal(ran, false);
  });
});

test("blockOnLive, local: passes straight through", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "local" }, async () => {
    let ran = false;
    const guarded = blockOnLive("Test engine is off on the live site", () => {
      ran = true;
    });
    await guarded(ctxWith());
    assert.equal(ran, true);
  });
});
