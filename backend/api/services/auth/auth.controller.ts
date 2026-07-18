// Thin controller — read the body, call the service, format the response. No logic,
// no storage. This is the only place the real bcrypt and the Postgres repo are wired
// to the pure service.

import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import bcrypt from "bcryptjs";
import type { RequestContext } from "../../router.ts";
import { createAuthService, createPasswordResetService } from "./auth.service.ts";
import type { PasswordHasher } from "./auth.service.ts";
import { pgAuthRepo, pgAuthSessionRepo, pgPasswordResetRepo } from "./auth.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import type { IdentityLookup } from "../../middleware/request-context.ts";
import { requireAuth, isSuperadminIdentity } from "../../middleware/require-auth.ts";
import { resolveAppEnv } from "../../../db/env-guard.ts";
import { sessionCookie, clearedSessionCookie, readCookie, SESSION_COOKIE } from "../../middleware/cookies.ts";
import { asRecord, asString } from "../../../shared/guards.ts";
import { notifyAdminOfNewRegistration, notifyPasswordReset } from "../notifications/notifications.service.ts";

// bcrypt cost 10 — the standard default; one-way, salted per hash.
const bcryptHasher: PasswordHasher = {
  hash: (plain) => bcrypt.hash(plain, 10),
  verify: (plain, hash) => bcrypt.compare(plain, hash),
};

const service = createAuthService(pgAuthRepo, bcryptHasher);
const resetService = createPasswordResetService(pgPasswordResetRepo, bcryptHasher);

// How long a login lasts before it expires (7 days).
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// The public origin, so the emailed reset link is a full clickable URL. Prefer an
// explicit APP_BASE_URL; otherwise derive it from the request (works local + live with
// no config). Mirrors invites.controller.ts — kept local here to stay surgical.
function requestBaseUrl(req: IncomingMessage): string {
  const envBase = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (envBase) return envBase;
  const fwdProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0]!.trim();
  const proto = fwdProto || ((req.socket as { encrypted?: boolean }).encrypted ? "https" : "http");
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "").split(",")[0]!.trim();
  return host ? `${proto}://${host}` : "";
}

// POST /api/v1/auth/register — { email, name, password } → 201 { user }
export async function register(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const user = await service.register({
    email: asString(body.email),
    name: asString(body.name),
    password: asString(body.password),
    company: asString(body.company),
  });
  // Fire-and-forget: tell the admin someone signed up. Never awaited — the response
  // and the signup itself must never wait on, or fail because of, an email.
  notifyAdminOfNewRegistration(user);
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
// The lookup is injectable (defaults to Postgres via buildIdentity) so it's unit-testable
// without a database — same pattern as the route guards.
export async function me(c: RequestContext, lookup?: IdentityLookup): Promise<void> {
  const identity = await buildIdentity(c.req, lookup);
  requireAuth(identity);
  // isSuperadmin is a server-computed BOOLEAN (the allowlist itself never leaves the
  // server) — the client uses it only to show/hide the nav item. It is NOT a security
  // boundary: every /api/v1/admin/* route still enforces requireSuperadmin (403) itself.
  // appEnv is server truth ("live" on Render, "local" in dev) — the app uses it to trim
  // internal-only nav on the live site (admin-live-deploy); also cosmetic, not a boundary.
  c.json(200, {
    userId: identity.userId,
    orgId: identity.orgId,
    roles: identity.roles,
    email: identity.email,
    name: identity.name,
    isSuperadmin: isSuperadminIdentity(identity),
    appEnv: resolveAppEnv(),
  });
}

// POST /api/v1/auth/change-password — protected. { currentPassword, newPassword } → 200
// { ok: true }. The signed-in manager changes their OWN password (audit M12): the user id
// comes from the SESSION, never the body, so a caller can only ever change their own. The
// current password must re-verify (a re-auth gate) before the new one is written.
export async function changePassword(c: RequestContext, lookup?: IdentityLookup): Promise<void> {
  const identity = await buildIdentity(c.req, lookup);
  requireAuth(identity);
  const body = asRecord(await c.readBody());
  await service.changePassword({
    userId: identity.userId!,
    currentPassword: asString(body.currentPassword),
    newPassword: asString(body.newPassword),
  });
  // A password change evicts every OTHER session (audit F4) — a stolen cookie can't
  // outlive the change. The device making the change keeps its session, so the manager
  // isn't logged out mid-task.
  const currentToken = readCookie(c.req, SESSION_COOKIE);
  if (currentToken) await pgAuthSessionRepo.deleteOthersForUser(identity.userId!, currentToken);
  else await pgAuthSessionRepo.deleteAllForUser(identity.userId!);
  c.json(200, { ok: true });
}

// POST /api/v1/auth/forgot-password — { email } → 200 { ok: true }, ALWAYS. The answer is
// the same generic success whether or not the email has an account (no account-existence
// leak — same posture as login). Only a real, active account gets a reset link, emailed
// fire-and-forget so the response never waits on, or fails because of, the email.
export async function forgotPassword(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const result = await resetService.requestPasswordReset(asString(body.email));
  if (result) {
    const base = requestBaseUrl(c.req);
    const link = `/reset-password/${result.token}`;
    notifyPasswordReset({ to: result.email, resetUrl: base ? `${base}${link}` : link });
  }
  c.json(200, { ok: true });
}

// POST /api/v1/auth/reset-password — { token, password } → 200 { ok: true }. Sets the new
// password and burns the token; throws a plain-words error for an invalid link or a
// too-short password. No auto-login — the app sends them to the login screen to prove it.
export async function resetPassword(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const userId = await resetService.resetPassword(asString(body.token), asString(body.password));
  // A reset is the "I think I'm compromised" move (audit F4) — evict ALL of that user's
  // sessions so a stolen cookie can't survive the reset.
  await pgAuthSessionRepo.deleteAllForUser(userId);
  c.json(200, { ok: true });
}

// (Removed GET /api/v1/auth/me/runs — member-nav Phase 2 security. It was org-fenced
// ONLY, so a member could list the whole company's runs; the client never used it, and
// GET /api/v1/runs/mine now serves the member's OWN runs, user-fenced. Door shut.)
