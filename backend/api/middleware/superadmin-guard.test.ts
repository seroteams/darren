import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { requireSuperadminRoute } from "./superadmin-guard.ts";
import { requireSuperadmin, isSuperadminIdentity, normalizeEmail } from "./require-auth.ts";
import type { IdentityLookup } from "./request-context.ts";
import type { RequestContext } from "../router.ts";

// A context carrying the cookie plus the method + path the audited funnel reads.
function ctxWith(cookie?: string): RequestContext {
  return {
    req: { headers: cookie ? { cookie } : {}, method: "GET" } as IncomingMessage,
    url: new URL("http://localhost/api/v1/admin/registered"),
    query: {},
    params: {},
  } as RequestContext;
}

// A no-op audit so the pass-through test stays hermetic (never writes the real audit file).
const noAudit = async () => {};

const SUPER = "carl@seroteams.com";

const noSession: IdentityLookup = async () => null;
const superSession: IdentityLookup = async (token) =>
  token === "super" ? { userId: "u1", orgId: "o1", roles: ["owner"], email: SUPER, name: "Carl" } : null;
const ownerSession: IdentityLookup = async (token) =>
  token === "owner" ? { userId: "u2", orgId: "o2", roles: ["owner"], email: "someone@acme.com", name: "Owner" } : null;

// Set env for one test and always restore (matches admin-guard.test.ts / request-context.test.ts).
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

// --- normalizeEmail (the one normalizer both sides of the compare go through) ---

test("normalizeEmail: trims + lower-cases, empty → null", () => {
  assert.equal(normalizeEmail("  Carl@Seroteams.com "), "carl@seroteams.com");
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail("   "), null);
  assert.equal(normalizeEmail(null), null);
  assert.equal(normalizeEmail(undefined), null);
});

// --- isSuperadminIdentity / requireSuperadmin (the pure gate) ---

test("isSuperadminIdentity: only an allowlisted, server-resolved email passes", async () => {
  await withEnv({ SUPERADMIN_EMAILS: SUPER }, async () => {
    assert.equal(isSuperadminIdentity({ userId: "u1", orgId: "o1", roles: ["owner"], email: SUPER, name: "Carl" }), true);
    // case/whitespace-insensitive
    assert.equal(isSuperadminIdentity({ userId: "u1", orgId: "o1", roles: ["owner"], email: " CARL@Seroteams.com ", name: "Carl" }), true);
    // a normal owner is NOT superadmin
    assert.equal(isSuperadminIdentity({ userId: "u2", orgId: "o2", roles: ["owner"], email: "someone@acme.com", name: "Owner" }), false);
    // anonymous (no email) is never superadmin
    assert.equal(isSuperadminIdentity({ userId: null, orgId: null, roles: [], email: null, name: null }), false);
  });
});

test("requireSuperadmin: anonymous → 401, non-allowlisted → 403, allowlisted → passes", async () => {
  await withEnv({ SUPERADMIN_EMAILS: SUPER }, async () => {
    assert.throws(() => requireSuperadmin({ userId: null, orgId: null, roles: [], email: null, name: null }), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 401);
      return true;
    });
    assert.throws(() => requireSuperadmin({ userId: "u2", orgId: "o2", roles: ["owner"], email: "someone@acme.com", name: "Owner" }), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      return true;
    });
    assert.doesNotThrow(() => requireSuperadmin({ userId: "u1", orgId: "o1", roles: ["owner"], email: SUPER, name: "Carl" }));
  });
});

test("requireSuperadmin: empty allowlist → nobody is superadmin", async () => {
  await withEnv({ SUPERADMIN_EMAILS: undefined }, async () => {
    assert.throws(() => requireSuperadmin({ userId: "u1", orgId: "o1", roles: ["owner"], email: SUPER, name: "Carl" }), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      return true;
    });
  });
});

// --- requireSuperadminRoute (the route wrapper over buildIdentity) ---

test("requireSuperadminRoute refuses an anonymous caller (401) and never runs the handler", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined, SUPERADMIN_EMAILS: SUPER }, async () => {
    let ran = false;
    const guarded = requireSuperadminRoute(() => {
      ran = true;
    }, noSession);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith())), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 401);
      return true;
    });
    assert.equal(ran, false, "handler must not run for an anonymous caller");
  });
});

test("requireSuperadminRoute refuses a logged-in non-allowlisted owner (403)", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined, SUPERADMIN_EMAILS: SUPER }, async () => {
    let ran = false;
    const guarded = requireSuperadminRoute(() => {
      ran = true;
    }, ownerSession);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith("sero_session=owner"))), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      return true;
    });
    assert.equal(ran, false, "a normal owner must not reach the superadmin route");
  });
});

test("requireSuperadminRoute runs the handler for the allowlisted superadmin", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: undefined, SUPERADMIN_EMAILS: SUPER }, async () => {
    let ran = false;
    const guarded = requireSuperadminRoute(() => {
      ran = true;
    }, superSession, noAudit);
    await guarded(ctxWith("sero_session=super"));
    assert.equal(ran, true, "the allowlisted superadmin must reach the route");
  });
});

test("requireSuperadminRoute: the dev side-door can NEVER be superadmin (its email isn't allowlisted)", async () => {
  await withEnv({ NODE_ENV: "development", DEV_AUTOLOGIN: "1", SUPERADMIN_EMAILS: SUPER }, async () => {
    let ran = false;
    const guarded = requireSuperadminRoute(() => {
      ran = true;
    }, noSession);
    await assert.rejects(() => Promise.resolve(guarded(ctxWith())), (err: unknown) => {
      assert.equal((err as { status?: number }).status, 403);
      return true;
    });
    assert.equal(ran, false, "the dev quick-login must never satisfy the superadmin gate");
  });
});
