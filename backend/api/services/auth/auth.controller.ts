// Thin controller — read the body, call the service, format the response. No logic,
// no storage. This is the only place the real bcrypt and the Postgres repo are wired
// to the pure service.

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { RequestContext } from "../../router.ts";
import { createAuthService } from "./auth.service.ts";
import type { PasswordHasher } from "./auth.service.ts";
import { pgAuthRepo, pgAuthSessionRepo } from "./auth.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAuth } from "../../middleware/require-auth.ts";
import { sessionCookie, clearedSessionCookie, readCookie, SESSION_COOKIE } from "../../middleware/cookies.ts";
import { asRecord, asString } from "../../../shared/guards.ts";

// bcrypt cost 10 — the standard default; one-way, salted per hash.
const bcryptHasher: PasswordHasher = {
  hash: (plain) => bcrypt.hash(plain, 10),
  verify: (plain, hash) => bcrypt.compare(plain, hash),
};

const service = createAuthService(pgAuthRepo, bcryptHasher);

// How long a login lasts before it expires (7 days).
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// POST /api/v1/auth/register — { email, name, password } → 201 { user }
export async function register(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const user = await service.register({
    email: asString(body.email),
    name: asString(body.name),
    password: asString(body.password),
    company: asString(body.company),
  });
  c.json(201, { user });
}

// POST /api/v1/auth/login — { email, password } → 200 { user } + sets the session
// cookie (so a refresh keeps you logged in).
export async function login(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const user = await service.login({ email: asString(body.email), password: asString(body.password) });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await pgAuthSessionRepo.create({ token, userId: user.id, orgId: user.orgId, expiresAt });
  c.res.setHeader("Set-Cookie", sessionCookie(token, SESSION_TTL_SECONDS));

  c.json(200, { user });
}

// POST /api/v1/auth/logout — clears the cookie and deletes the session row, so the
// pass is revoked server-side (not just forgotten by the browser).
export async function logout(c: RequestContext): Promise<void> {
  const token = readCookie(c.req, SESSION_COOKIE);
  if (token) await pgAuthSessionRepo.delete(token);
  c.res.setHeader("Set-Cookie", clearedSessionCookie());
  c.json(200, { ok: true });
}

// GET /api/v1/auth/me — protected. Turns logged-out visitors away (401); returns the
// caller's identity when logged in. The Phase 3 proof that the guard works.
export async function me(c: RequestContext): Promise<void> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity);
  c.json(200, { userId: identity.userId, orgId: identity.orgId, roles: identity.roles });
}

// (Removed GET /api/v1/auth/me/runs — member-nav Phase 2 security. It was org-fenced
// ONLY, so a member could list the whole company's runs; the client never used it, and
// GET /api/v1/runs/mine now serves the member's OWN runs, user-fenced. Door shut.)
