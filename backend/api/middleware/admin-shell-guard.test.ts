import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireAdminShell } from "./admin-shell-guard.ts";
import type { IdentityLookup } from "./request-context.ts";

const SUPER = "carl@seroteams.com";

const noSession: IdentityLookup = async () => null;
const managerSession: IdentityLookup = async (token) =>
  token === "manager" ? { userId: "u2", orgId: "o2", roles: ["manager"], email: "someone@acme.com", name: "Owner" } : null;
const memberSession: IdentityLookup = async (token) =>
  token === "member" ? { userId: "u3", orgId: "o3", roles: ["member"], email: "grunt@acme.com", name: "Member" } : null;
const adminSession: IdentityLookup = async (token) =>
  token === "admin" ? { userId: "u4", orgId: "o4", roles: ["admin"], email: "staff@seroteams.com", name: "Staff" } : null;
const superByEmail: IdentityLookup = async (token) =>
  token === "super" ? { userId: "u1", orgId: "o1", roles: ["manager"], email: SUPER, name: "Carl" } : null;

function reqWith(cookie?: string): IncomingMessage {
  return { headers: cookie ? { cookie } : {}, method: "GET" } as IncomingMessage;
}

// A response double that records the redirect without touching a socket.
function fakeRes(): ServerResponse & { _status?: number; _headers?: Record<string, string>; _ended: boolean } {
  const r = {
    _ended: false,
    writeHead(status: number, headers?: Record<string, string>) {
      (this as { _status?: number })._status = status;
      (this as { _headers?: Record<string, string> })._headers = headers;
      return this;
    },
    end() {
      (this as { _ended: boolean })._ended = true;
    },
  };
  return r as unknown as ServerResponse & { _status?: number; _headers?: Record<string, string>; _ended: boolean };
}

const url = new URL("http://localhost/admin/pulse");

// Set env for one test and always restore (matches internal-tool-guard.test.ts).
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

const BASE_ENV = { NODE_ENV: "production", DEV_AUTOLOGIN: undefined, SUPERADMIN_EMAILS: SUPER };

test("admin shell: anonymous is redirected to / (never sees the console)", async () => {
  await withEnv(BASE_ENV, async () => {
    let served = false;
    const guard = requireAdminShell(() => { served = true; }, noSession);
    const res = fakeRes();
    await guard(reqWith(), res, url);
    assert.equal(served, false, "the admin bundle must not be served to a logged-out visitor");
    assert.equal(res._status, 302);
    assert.equal(res._headers?.Location, "/");
    assert.equal(res._ended, true);
  });
});

test("admin shell: a manager is redirected to / (the reported bug)", async () => {
  await withEnv(BASE_ENV, async () => {
    let served = false;
    const guard = requireAdminShell(() => { served = true; }, managerSession);
    const res = fakeRes();
    await guard(reqWith("sero_session=manager"), res, url);
    assert.equal(served, false, "a manager must never load the admin shell");
    assert.equal(res._status, 302);
    assert.equal(res._headers?.Location, "/");
  });
});

test("admin shell: a member is redirected to /", async () => {
  await withEnv(BASE_ENV, async () => {
    let served = false;
    const guard = requireAdminShell(() => { served = true; }, memberSession);
    const res = fakeRes();
    await guard(reqWith("sero_session=member"), res, url);
    assert.equal(served, false);
    assert.equal(res._status, 302);
  });
});

test("admin shell: an internal admin (role admin) is served the console", async () => {
  await withEnv(BASE_ENV, async () => {
    let served = false;
    const guard = requireAdminShell(() => { served = true; }, adminSession);
    const res = fakeRes();
    await guard(reqWith("sero_session=admin"), res, url);
    assert.equal(served, true, "internal admins use the console + internal tools");
    assert.equal(res._status, undefined, "no redirect was written");
  });
});

test("admin shell: the allowlisted superadmin (role manager) is served the console", async () => {
  await withEnv(BASE_ENV, async () => {
    let served = false;
    const guard = requireAdminShell(() => { served = true; }, superByEmail);
    const res = fakeRes();
    await guard(reqWith("sero_session=super"), res, url);
    assert.equal(served, true, "a superadmin-by-email must reach the console even with a manager role");
  });
});
