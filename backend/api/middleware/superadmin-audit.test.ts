import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { requireSuperadminRoute } from "./superadmin-guard.ts";
import { superadminAuditEntry } from "./superadmin-audit.ts";
import type { SuperadminAuditEntry } from "./superadmin-audit.ts";
import type { IdentityLookup } from "./request-context.ts";
import type { RequestContext } from "../router.ts";

const SUPER = "carl@seroteams.com";

// A context carrying the cookie, method, and path the audited funnel reads.
function ctxWith(cookie: string | undefined, pathname = "/api/v1/admin/registered", method = "GET"): RequestContext {
  return {
    req: { headers: cookie ? { cookie } : {}, method } as IncomingMessage,
    url: new URL(`http://localhost${pathname}`),
    query: {},
    params: {},
  } as RequestContext;
}

const superSession: IdentityLookup = async (token) =>
  token === "super" ? { userId: "u1", orgId: "o1", roles: ["admin"], email: SUPER, name: "Carl" } : null;
const ownerSession: IdentityLookup = async (token) =>
  token === "owner" ? { userId: "u2", orgId: "o2", roles: ["manager"], email: "someone@acme.com", name: "Owner" } : null;

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

// --- the audit record (pure builder) ---

test("superadminAuditEntry records who/what/when — and no secret", () => {
  const entry = superadminAuditEntry(
    { userId: "u1", orgId: "o1", roles: ["admin"], email: SUPER, name: "Carl" },
    "GET",
    "/api/v1/admin/registered",
    "2026-07-04T00:00:00.000Z",
  );
  assert.deepEqual(entry, {
    at: "2026-07-04T00:00:00.000Z",
    userId: "u1",
    email: SUPER,
    method: "GET",
    route: "/api/v1/admin/registered",
  });
  assert.ok(!("passwordHash" in entry), "an audit record never carries a secret");
});

// --- the funnel audits real access, and only real access ---

test("requireSuperadminRoute audits an authorized superadmin access exactly once", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined, SUPERADMIN_EMAILS: SUPER }, async () => {
    const entries: SuperadminAuditEntry[] = [];
    const guarded = requireSuperadminRoute(() => {}, superSession, async (e) => {
      entries.push(e);
    });
    await guarded(ctxWith("sero_session=super", "/api/v1/admin/registered", "GET"));
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.email, SUPER);
    assert.equal(entries[0]!.userId, "u1");
    assert.equal(entries[0]!.route, "/api/v1/admin/registered");
    assert.equal(entries[0]!.method, "GET");
  });
});

test("requireSuperadminRoute does NOT audit a refused (403) access", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined, SUPERADMIN_EMAILS: SUPER }, async () => {
    const entries: SuperadminAuditEntry[] = [];
    const guarded = requireSuperadminRoute(() => {}, ownerSession, async (e) => {
      entries.push(e);
    });
    await assert.rejects(() => Promise.resolve(guarded(ctxWith("sero_session=owner"))), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      return true;
    });
    assert.equal(entries.length, 0, "a refused access must not be audited as a success");
  });
});
