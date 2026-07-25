import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { start, callback, encodeStateCookie } from "./google-auth.controller.ts";
import type { CallbackDeps, StartService } from "./google-auth.controller.ts";
import { GoogleAuthError } from "./google-auth.service.ts";
import type { GoogleUser } from "./google-auth.service.ts";
import { OAUTH_STATE_COOKIE } from "../../middleware/cookies.ts";
import type { RequestContext } from "../../router.ts";

// --- Harness ---------------------------------------------------------------

interface Sent {
  status: number;
  location: string;
  cookies: string[];
}

/** A context that captures the redirect + cookies the controller writes. */
function ctx(urlStr: string, cookie?: string): { c: RequestContext; sent: () => Sent } {
  const url = new URL(urlStr);
  let status = 0;
  let location = "";
  let cookies: string[] = [];
  const res = {
    setHeader: (name: string, value: string | string[]) => {
      if (name.toLowerCase() === "set-cookie") cookies = Array.isArray(value) ? value : [value];
    },
    writeHead: (s: number, headers?: Record<string, string>) => {
      status = s;
      location = headers?.Location ?? "";
      return res;
    },
    end: () => {},
  } as unknown as ServerResponse;
  const c = {
    // socket present because requestBaseUrl probes req.socket.encrypted
    req: { headers: cookie ? { cookie } : {}, method: "GET", socket: {} } as IncomingMessage,
    res,
    url,
    query: Object.fromEntries(url.searchParams),
    params: {},
  } as unknown as RequestContext;
  return { c, sent: () => ({ status, location, cookies }) };
}

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

const GOOGLE_ENV = {
  NODE_ENV: "development",
  APP_BASE_URL: undefined,
  GOOGLE_CLIENT_ID: "client-1.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "secret-1",
};

function fakeUser(): GoogleUser {
  return { id: "u1", orgId: "o1", email: "maria@acme.com", name: "Maria", role: "manager", deactivatedAt: null };
}

const startSvc: StartService = {
  beginSignIn: async ({ returnTo }) => ({
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth?fake=1",
    nonce: "n-1",
    codeVerifier: "v-1",
    returnTo: returnTo === "/admin" ? "/admin" : "/",
  }),
};

interface DepsCalls {
  sessions: Array<{ token: string; userId: string; orgId: string; expiresAt: Date }>;
  registrations: string[];
  members: string[];
  seeded: string[];
}

function fakeDeps(
  outcome: "login" | "linked" | "invite-accepted" | "signed-up",
  fail?: unknown,
): { deps: CallbackDeps; calls: DepsCalls } {
  const calls: DepsCalls = { sessions: [], registrations: [], members: [], seeded: [] };
  const deps: CallbackDeps = {
    svc: {
      completeSignIn: async () => {
        if (fail) throw fail;
        return { user: fakeUser(), outcome };
      },
    },
    sessions: {
      create: async (input) => {
        calls.sessions.push(input);
      },
    },
    notifyRegistration: (u) => calls.registrations.push(u.email),
    notifyMember: (u) => calls.members.push(u.email),
    seed: (u) => calls.seeded.push(u.id),
  };
  return { deps, calls };
}

const stateCookie = (returnTo = "/"): string =>
  `${OAUTH_STATE_COOKIE}=${encodeStateCookie({ nonce: "n-1", verifier: "v-1", returnTo })}`;

// --- start -----------------------------------------------------------------

test("start sets the scoped state cookie and redirects to Google", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/start");
    await start(c, false, startSvc);
    const { status, location, cookies } = sent();
    assert.equal(status, 302);
    assert.equal(location, "https://accounts.google.com/o/oauth2/v2/auth?fake=1");
    assert.equal(cookies.length, 1);
    const cookie = cookies[0]!;
    assert.ok(cookie.startsWith(`${OAUTH_STATE_COOKIE}=`));
    assert.ok(cookie.includes("HttpOnly"));
    assert.ok(cookie.includes("SameSite=Lax"));
    assert.ok(cookie.includes("Max-Age=600"));
    assert.ok(cookie.includes("Path=/api/v1/auth/google"));
    assert.equal(cookie.split("=")[1]!.split(";")[0], encodeStateCookie({ nonce: "n-1", verifier: "v-1", returnTo: "/" }));
  });
});

test("start?app=admin carries the admin return target into the state cookie", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/start?app=admin");
    await start(c, false, startSvc);
    assert.equal(sent().cookies[0]!.split("=")[1]!.split(";")[0], encodeStateCookie({ nonce: "n-1", verifier: "v-1", returnTo: "/admin" }));
  });
});

test("start without Google env bounces to login with google-unavailable", async () => {
  await withEnv({ ...GOOGLE_ENV, GOOGLE_CLIENT_ID: undefined }, async () => {
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/start");
    await start(c, false, startSvc);
    assert.equal(sent().status, 302);
    assert.equal(sent().location, "http://localhost:3002/login?error=google-unavailable");
  });
});

test("start over the rate limit bounces to login without calling Google", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/start?app=admin");
    await start(c, true, startSvc);
    assert.equal(sent().location, "http://localhost:3000/admin/login?error=rate-limited");
  });
});

// --- callback --------------------------------------------------------------

test("callback on success mints the session, clears the state cookie and lands home (dev customer)", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const { deps, calls } = fakeDeps("login");
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/"));
    await callback(c, false, deps);
    const { status, location, cookies } = sent();
    assert.equal(status, 302);
    assert.equal(location, "http://localhost:3002/");
    assert.equal(calls.sessions.length, 1);
    const session = calls.sessions[0]!;
    assert.match(session.token, /^[0-9a-f]{64}$/);
    assert.equal(session.userId, "u1");
    assert.equal(session.orgId, "o1");
    assert.ok(session.expiresAt.getTime() > Date.now());
    assert.equal(cookies.length, 2);
    assert.ok(cookies[0]!.startsWith(`${OAUTH_STATE_COOKIE}=;`)); // cleared
    assert.ok(cookies[1]!.startsWith("sero_session="));
    // a plain login fires no signup side effects
    assert.equal(calls.registrations.length, 0);
    assert.equal(calls.members.length, 0);
    assert.equal(calls.seeded.length, 0);
  });
});

test("callback in production lands on the admin path and sets a Secure session cookie", async () => {
  await withEnv({ ...GOOGLE_ENV, NODE_ENV: "production" }, async () => {
    const { deps } = fakeDeps("login");
    const { c, sent } = ctx("https://sero.example/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/admin"));
    await callback(c, false, deps);
    assert.equal(sent().location, "/admin/");
    assert.ok(sent().cookies[1]!.includes("Secure"));
  });
});

test("callback fires signup side effects only for a fresh signup", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const signedUp = fakeDeps("signed-up");
    const { c } = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/"));
    await callback(c, false, signedUp.deps);
    assert.deepEqual(signedUp.calls.registrations, ["maria@acme.com"]);
    assert.deepEqual(signedUp.calls.seeded, ["u1"]);
    assert.equal(signedUp.calls.members.length, 0);

    const joined = fakeDeps("invite-accepted");
    const second = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/"));
    await callback(second.c, false, joined.deps);
    assert.deepEqual(joined.calls.members, ["maria@acme.com"]);
    assert.equal(joined.calls.registrations.length, 0);
    assert.equal(joined.calls.seeded.length, 0);
  });
});

test("callback with Google's access_denied bounces with google-denied and clears the state cookie", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const { deps, calls } = fakeDeps("login");
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/callback?error=access_denied", stateCookie("/"));
    await callback(c, false, deps);
    assert.equal(sent().location, "http://localhost:3002/login?error=google-denied");
    assert.ok(sent().cookies[0]!.startsWith(`${OAUTH_STATE_COOKIE}=;`));
    assert.equal(calls.sessions.length, 0);
  });
});

test("callback without the state cookie bounces with google-state", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const { deps, calls } = fakeDeps("login");
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1");
    await callback(c, false, deps);
    assert.equal(sent().location, "http://localhost:3002/login?error=google-state");
    assert.equal(calls.sessions.length, 0);
  });
});

test("callback surfaces a known GoogleAuthError code and maps unknown failures to google-failed", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const known = fakeDeps("login", new GoogleAuthError("google-unverified"));
    const first = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/"));
    await callback(first.c, false, known.deps);
    assert.equal(first.sent().location, "http://localhost:3002/login?error=google-unverified");

    const unknown = fakeDeps("login", new Error("db down"));
    const second = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/"));
    await callback(second.c, false, unknown.deps);
    assert.equal(second.sent().location, "http://localhost:3002/login?error=google-failed");
  });
});

test("callback over the rate limit bounces before touching the service", async () => {
  await withEnv(GOOGLE_ENV, async () => {
    const { deps, calls } = fakeDeps("login");
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/admin"));
    await callback(c, true, deps);
    assert.equal(sent().location, "http://localhost:3000/admin/login?error=rate-limited");
    assert.equal(calls.sessions.length, 0);
  });
});

test("callback without Google env bounces with google-unavailable", async () => {
  await withEnv({ ...GOOGLE_ENV, GOOGLE_CLIENT_SECRET: undefined }, async () => {
    const { deps } = fakeDeps("login");
    const { c, sent } = ctx("http://localhost:3001/api/v1/auth/google/callback?code=c1&state=n-1", stateCookie("/"));
    await callback(c, false, deps);
    assert.equal(sent().location, "http://localhost:3002/login?error=google-unavailable");
  });
});
