import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { me } from "./auth.controller.ts";
import type { IdentityLookup } from "../../middleware/request-context.ts";
import type { RequestContext } from "../../router.ts";

// A context that captures the JSON the controller writes.
function ctxWith(cookie?: string): { c: RequestContext; sent: () => { status: number; body: Record<string, unknown> } } {
  let status = 0;
  let body: Record<string, unknown> = {};
  const c = {
    req: { headers: cookie ? { cookie } : {}, method: "GET" } as IncomingMessage,
    url: new URL("http://localhost/api/v1/auth/me"),
    query: {},
    params: {},
    json: (s: number, b: Record<string, unknown>) => {
      status = s;
      body = b;
    },
  } as unknown as RequestContext;
  return { c, sent: () => ({ status, body }) };
}

const session: IdentityLookup = async (token) =>
  token === "tok" ? { userId: "u1", orgId: "o1", roles: ["manager"], email: "carl@seroteams.com", name: "Carl" } : null;

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

const BASE_ENV = { NODE_ENV: "development", DEV_AUTOLOGIN: undefined };

test("/auth/me reports appEnv=local when the app runs locally", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "local" }, async () => {
    const { c, sent } = ctxWith("sero_session=tok");
    await me(c, session);
    const { status, body } = sent();
    assert.equal(status, 200);
    assert.equal(body.appEnv, "local");
    assert.equal(body.email, "carl@seroteams.com");
  });
});

test("/auth/me reports appEnv=live when the app runs as live", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "live" }, async () => {
    const { c, sent } = ctxWith("sero_session=tok");
    await me(c, session);
    assert.equal(sent().body.appEnv, "live");
  });
});

test("/auth/me still turns a logged-out visitor away (401)", async () => {
  await withEnv({ ...BASE_ENV, APP_ENV: "local" }, async () => {
    const { c } = ctxWith();
    await assert.rejects(() => me(c, session), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 401);
      return true;
    });
  });
});
