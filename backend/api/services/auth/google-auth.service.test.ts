import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createGoogleAuthService,
  validateIdClaims,
  GoogleAuthError,
} from "./google-auth.service.ts";
import type { GoogleAuthRepo, GoogleUser, GoogleTokenExchanger } from "./google-auth.service.ts";

// --- Fakes -----------------------------------------------------------------

const CLIENT = "client-1.apps.googleusercontent.com";
const NOW = 1_800_000_000_000; // fixed clock, ms

/** A signed-looking id_token whose middle segment is just base64url JSON — the
 *  service only decodes the payload (the token arrives over our own TLS exchange). */
function idToken(payload: Record<string, unknown>): string {
  return `head.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
}

function claims(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT,
    exp: Math.floor(NOW / 1000) + 3600,
    sub: "sub-1",
    email: "maria@acme.com",
    email_verified: true,
    name: "Maria",
    nonce: "n-1",
    ...over,
  };
}

function user(over: Partial<GoogleUser> = {}): GoogleUser {
  return { id: "u1", orgId: "o1", email: "maria@acme.com", name: "Maria", role: "manager", deactivatedAt: null, ...over };
}

interface RepoCalls {
  linked: Array<[string, string]>;
  created: Array<Record<string, unknown>>;
  accepted: Array<Record<string, unknown>>;
  emailLookups: string[];
}

function fakeRepo(overrides: Partial<GoogleAuthRepo> = {}): { repo: GoogleAuthRepo; calls: RepoCalls } {
  const calls: RepoCalls = { linked: [], created: [], accepted: [], emailLookups: [] };
  const repo: GoogleAuthRepo = {
    findBySub: async () => null,
    findByEmail: async (email) => {
      calls.emailLookups.push(email);
      return null;
    },
    linkSub: async (userId, sub) => {
      calls.linked.push([userId, sub]);
    },
    findPendingInviteByEmail: async () => null,
    acceptInviteWithGoogle: async (input) => {
      calls.accepted.push(input as unknown as Record<string, unknown>);
      return user({ id: "u-inv", orgId: input.orgId, email: input.email, name: input.name, role: input.role });
    },
    createOrgWithGoogleOwner: async (input) => {
      calls.created.push(input as unknown as Record<string, unknown>);
      return user({ id: "u-new", orgId: "o-new", email: input.email, name: input.name });
    },
    ...overrides,
  };
  return { repo, calls };
}

function exchangerReturning(payload: Record<string, unknown> | null): GoogleTokenExchanger {
  return { exchange: async () => (payload ? { idToken: idToken(payload) } : null) };
}

function svcWith(repo: GoogleAuthRepo, payload: Record<string, unknown> | null) {
  return createGoogleAuthService(repo, { exchanger: exchangerReturning(payload), now: () => NOW });
}

function completeInput(over: Record<string, unknown> = {}) {
  return {
    clientId: CLIENT,
    code: "code-1",
    state: "n-1",
    cookieNonce: "n-1",
    codeVerifier: "v-1",
    redirectUri: "http://localhost:3001/api/v1/auth/google/callback",
    ...over,
  };
}

async function expectCode(p: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(p, (err: unknown) => {
    assert.ok(err instanceof GoogleAuthError, `expected GoogleAuthError, got ${String(err)}`);
    assert.equal(err.code, code);
    return true;
  });
}

// --- beginSignIn -----------------------------------------------------------

test("beginSignIn builds a Google authorize URL with PKCE, state and nonce", async () => {
  const { repo } = fakeRepo();
  const svc = svcWith(repo, claims());
  const startResult = await svc.beginSignIn({ clientId: CLIENT, redirectUri: "http://x/cb", returnTo: "/admin" });

  const url = new URL(startResult.authorizeUrl);
  assert.equal(url.host, "accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), CLIENT);
  assert.equal(url.searchParams.get("redirect_uri"), "http://x/cb");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("prompt"), "select_account");
  assert.equal(url.searchParams.get("state"), startResult.nonce);
  assert.equal(url.searchParams.get("nonce"), startResult.nonce);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  const expectedChallenge = createHash("sha256").update(startResult.codeVerifier).digest("base64url");
  assert.equal(url.searchParams.get("code_challenge"), expectedChallenge);
  assert.equal(startResult.returnTo, "/admin");
  assert.ok(startResult.nonce.length >= 16);
  assert.ok(startResult.codeVerifier.length >= 43); // RFC 7636 minimum
});

test("beginSignIn allowlists the return target — anything unknown becomes /", async () => {
  const { repo } = fakeRepo();
  const svc = svcWith(repo, claims());
  const evil = await svc.beginSignIn({ clientId: CLIENT, redirectUri: "http://x/cb", returnTo: "https://evil.example" });
  assert.equal(evil.returnTo, "/");
  const home = await svc.beginSignIn({ clientId: CLIENT, redirectUri: "http://x/cb", returnTo: "/" });
  assert.equal(home.returnTo, "/");
});

test("beginSignIn mints a fresh nonce and verifier every time", async () => {
  const { repo } = fakeRepo();
  const svc = svcWith(repo, claims());
  const a = await svc.beginSignIn({ clientId: CLIENT, redirectUri: "http://x/cb", returnTo: "/" });
  const b = await svc.beginSignIn({ clientId: CLIENT, redirectUri: "http://x/cb", returnTo: "/" });
  assert.notEqual(a.nonce, b.nonce);
  assert.notEqual(a.codeVerifier, b.codeVerifier);
});

// --- validateIdClaims ------------------------------------------------------

test("validateIdClaims accepts a good Google payload", () => {
  const out = validateIdClaims(claims(), { clientId: CLIENT, nonce: "n-1", now: NOW });
  assert.equal(out.sub, "sub-1");
  assert.equal(out.email, "maria@acme.com");
  assert.equal(out.name, "Maria");
});

test("validateIdClaims refuses wrong issuer, wrong audience, expiry, nonce mismatch and missing sub", () => {
  const cases: Array<Record<string, unknown>> = [
    claims({ iss: "https://evil.example" }),
    claims({ aud: "someone-else" }),
    claims({ exp: Math.floor(NOW / 1000) - 10 }),
    claims({ nonce: "other" }),
    claims({ sub: "" }),
    claims({ email: undefined }),
  ];
  for (const payload of cases) {
    assert.throws(
      () => validateIdClaims(payload, { clientId: CLIENT, nonce: "n-1", now: NOW }),
      (err: unknown) => err instanceof GoogleAuthError && err.code === "google-verify",
    );
  }
});

test("validateIdClaims accepts an audience ARRAY containing our client id", () => {
  const out = validateIdClaims(claims({ aud: [CLIENT, "other"] }), { clientId: CLIENT, nonce: "n-1", now: NOW });
  assert.equal(out.sub, "sub-1");
});

test("validateIdClaims refuses an unverified email with its own code", () => {
  assert.throws(
    () => validateIdClaims(claims({ email_verified: false }), { clientId: CLIENT, nonce: "n-1", now: NOW }),
    (err: unknown) => err instanceof GoogleAuthError && err.code === "google-unverified",
  );
});

// --- completeSignIn: handshake failures ------------------------------------

test("completeSignIn refuses a state that does not match the cookie nonce", async () => {
  const { repo } = fakeRepo();
  const svc = svcWith(repo, claims());
  await expectCode(svc.completeSignIn(completeInput({ state: "tampered" })), "google-state");
  await expectCode(svc.completeSignIn(completeInput({ cookieNonce: "" })), "google-state");
});

test("completeSignIn refuses a missing code, and a failed exchange (expired/replayed)", async () => {
  const { repo } = fakeRepo();
  await expectCode(svcWith(repo, claims()).completeSignIn(completeInput({ code: "" })), "google-exchange");
  await expectCode(svcWith(repo, null).completeSignIn(completeInput()), "google-exchange");
});

test("completeSignIn refuses a malformed id_token", async () => {
  const { repo } = fakeRepo();
  const svc = createGoogleAuthService(repo, {
    exchanger: { exchange: async () => ({ idToken: "not-a-jwt" }) },
    now: () => NOW,
  });
  await expectCode(svc.completeSignIn(completeInput()), "google-verify");
});

// --- completeSignIn: the account ladder ------------------------------------

test("ladder (a): a known google_sub just logs in — no linking, no creating", async () => {
  const existing = user();
  const { repo, calls } = fakeRepo({ findBySub: async (sub) => (sub === "sub-1" ? existing : null) });
  const result = await svcWith(repo, claims()).completeSignIn(completeInput());
  assert.equal(result.outcome, "login");
  assert.equal(result.user.id, "u1");
  assert.equal(calls.linked.length, 0);
  assert.equal(calls.created.length, 0);
});

test("ladder (a): a deactivated account is refused before anything is written", async () => {
  const { repo, calls } = fakeRepo({ findBySub: async () => user({ deactivatedAt: new Date(NOW) }) });
  await expectCode(svcWith(repo, claims()).completeSignIn(completeInput()), "account-off");
  assert.equal(calls.linked.length, 0);
});

test("ladder (b): a matching email links the Google id and logs in; email is normalized first", async () => {
  const existing = user();
  const { repo, calls } = fakeRepo({ findByEmail: async (email) => (email === "maria@acme.com" ? existing : null) });
  const result = await svcWith(repo, claims({ email: "MARIA@Acme.com" })).completeSignIn(completeInput());
  assert.equal(result.outcome, "linked");
  assert.deepEqual(calls.linked, [["u1", "sub-1"]]);
});

test("ladder (b): a deactivated email match is refused and never linked", async () => {
  const { repo, calls } = fakeRepo({ findByEmail: async () => user({ deactivatedAt: new Date(NOW) }) });
  await expectCode(svcWith(repo, claims()).completeSignIn(completeInput()), "account-off");
  assert.equal(calls.linked.length, 0);
});

test("ladder (c): a pending invite is auto-accepted into the inviting org", async () => {
  const { repo, calls } = fakeRepo({
    findPendingInviteByEmail: async () => ({ id: "inv-1", orgId: "o-acme", role: "member", personId: "p-1" }),
  });
  const result = await svcWith(repo, claims()).completeSignIn(completeInput());
  assert.equal(result.outcome, "invite-accepted");
  assert.equal(calls.accepted.length, 1);
  const accepted = calls.accepted[0]!;
  assert.equal(accepted.inviteId, "inv-1");
  assert.equal(accepted.orgId, "o-acme");
  assert.equal(accepted.role, "member");
  assert.equal(accepted.personId, "p-1");
  assert.equal(accepted.email, "maria@acme.com");
  assert.equal(accepted.sub, "sub-1");
});

test("ladder (d): a brand-new email signs up — new org, name-derived company, google id stored", async () => {
  const { repo, calls } = fakeRepo();
  const result = await svcWith(repo, claims()).completeSignIn(completeInput());
  assert.equal(result.outcome, "signed-up");
  assert.equal(calls.created.length, 1);
  const created = calls.created[0]!;
  assert.equal(created.company, "Maria's Company");
  assert.equal(created.email, "maria@acme.com");
  assert.equal(created.name, "Maria");
  assert.equal(created.sub, "sub-1");
});

test("ladder (d): a missing profile name falls back to the email's local part", async () => {
  const { repo, calls } = fakeRepo();
  await svcWith(repo, claims({ name: undefined })).completeSignIn(completeInput());
  assert.equal(calls.created[0]!.name, "maria");
  assert.equal(calls.created[0]!.company, "maria's Company");
});
