// Thin controller for Google sign-in (google-signin Phase 1) — cookies, redirects,
// and the real network edge (the token exchange). Two GET routes:
//
//   /api/v1/auth/google/start     → set the state cookie, 302 to Google
//   /api/v1/auth/google/callback  → verify, find-or-create, mint the SAME session
//                                   cookie as password login, 302 home
//
// Both handlers NEVER throw: every failure becomes a 302 to the login screen with
// a stable ?error= code (the wrapper's JSON error shape must never answer a
// browser navigation). The router has no redirect helper — the 302 is written
// manually (precedent: admin-shell-guard.ts).

import { randomBytes } from "node:crypto";
import type { RequestContext } from "../../router.ts";
import { createGoogleAuthService, GoogleAuthError } from "./google-auth.service.ts";
import type { GoogleReturnTo, GoogleSignInResult, GoogleTokenExchanger, GoogleUser } from "./google-auth.service.ts";
import { pgGoogleAuthRepo } from "./google-auth.repo.ts";
import { pgAuthSessionRepo } from "./auth.repo.ts";
import type { NewSession } from "./auth.repo.ts";
import { requestBaseUrl, SESSION_TTL_SECONDS } from "./auth.controller.ts";
import { seedDemoWorkspace } from "./demo-seed.service.ts";
import {
  OAUTH_STATE_COOKIE,
  oauthStateCookie,
  clearedOauthStateCookie,
  readCookie,
  sessionCookie,
} from "../../middleware/cookies.ts";
import { notifyAdminOfNewRegistration, notifyAdminOfNewMember } from "../notifications/notifications.service.ts";
import type { RegisteredUser } from "../notifications/notifications.service.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// --- Config + URLs ---------------------------------------------------------

function googleEnv(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** The SPA origin+base for a return target. In dev each app is its own Vite server
 *  (the API answers on :3001, where neither SPA lives), so the redirect must name
 *  the right port; in prod one origin serves both, so paths suffice. The input is
 *  the allowlisted token, never a caller-supplied URL. */
function appBase(returnTo: GoogleReturnTo): string {
  const dev = process.env.NODE_ENV !== "production";
  if (returnTo === "/admin") return dev ? "http://localhost:3000/admin" : "/admin";
  return dev ? "http://localhost:3002" : "";
}

function redirect(c: RequestContext, location: string, cookies: string[]): void {
  if (cookies.length) c.res.setHeader("Set-Cookie", cookies);
  c.res.writeHead(302, { Location: location });
  c.res.end();
}

function redirectToLogin(c: RequestContext, returnTo: GoogleReturnTo, code: string, cookies: string[]): void {
  redirect(c, `${appBase(returnTo)}/login?error=${code}`, cookies);
}

// --- State cookie value ----------------------------------------------------
// base64url JSON { n: nonce, v: PKCE verifier, r: return target }. No HMAC needed:
// the cookie only round-trips to us (HttpOnly), and matching Google's `state`
// against `n` proves the same browser started the flow; `r` is re-validated
// against the allowlist on the way out anyway.

interface StateCookiePayload {
  nonce: string;
  verifier: string;
  returnTo: string;
}

export function encodeStateCookie(payload: StateCookiePayload): string {
  return Buffer.from(JSON.stringify({ n: payload.nonce, v: payload.verifier, r: payload.returnTo })).toString(
    "base64url",
  );
}

function decodeStateCookie(value: string | null): StateCookiePayload | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const rec = parsed as Record<string, unknown>;
    if (typeof rec?.n !== "string" || typeof rec?.v !== "string") return null;
    return { nonce: rec.n, verifier: rec.v, returnTo: typeof rec.r === "string" ? rec.r : "/" };
  } catch {
    return null;
  }
}

const sanitizeReturnTo = (value: string | undefined): GoogleReturnTo => (value === "/admin" ? "/admin" : "/");

// --- The real token exchange (the one network call) ------------------------

const realExchanger: GoogleTokenExchanger = {
  async exchange({ code, redirectUri, codeVerifier }) {
    const env = googleEnv();
    if (!env) return null;
    try {
      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.clientId,
          client_secret: env.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code_verifier: codeVerifier,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { id_token?: unknown };
      return typeof data.id_token === "string" && data.id_token ? { idToken: data.id_token } : null;
    } catch {
      return null; // network/timeout — the caller answers with a friendly retry
    }
  },
};

const service = createGoogleAuthService(pgGoogleAuthRepo, { exchanger: realExchanger });

// --- Injectable seams (tests swap these; production uses the real ones) -----

export interface StartService {
  beginSignIn: (input: { clientId: string; redirectUri: string; returnTo: string }) => Promise<{
    authorizeUrl: string;
    nonce: string;
    codeVerifier: string;
    returnTo: GoogleReturnTo;
  }>;
}

export interface CallbackDeps {
  svc: {
    completeSignIn: (input: {
      clientId: string;
      code: string;
      state: string;
      cookieNonce: string;
      codeVerifier: string;
      redirectUri: string;
    }) => Promise<GoogleSignInResult>;
  };
  sessions: { create: (input: NewSession) => Promise<void> };
  notifyRegistration: (user: RegisteredUser) => void;
  notifyMember: (user: RegisteredUser) => void;
  seed: (user: GoogleUser) => unknown;
}

const realCallbackDeps: CallbackDeps = {
  svc: service,
  sessions: pgAuthSessionRepo,
  notifyRegistration: notifyAdminOfNewRegistration,
  notifyMember: notifyAdminOfNewMember,
  seed: seedDemoWorkspace,
};

// --- Handlers --------------------------------------------------------------

// GET /api/v1/auth/google/start?app=admin|customer — 302 to Google's consent screen.
export async function start(c: RequestContext, limited: boolean, svc: StartService = service): Promise<void> {
  const returnTo = sanitizeReturnTo(c.query.app === "admin" ? "/admin" : "/");
  try {
    if (limited) return redirectToLogin(c, returnTo, "rate-limited", []);
    const env = googleEnv();
    if (!env) return redirectToLogin(c, returnTo, "google-unavailable", []);

    const redirectUri = `${requestBaseUrl(c.req)}/api/v1/auth/google/callback`;
    const begun = await svc.beginSignIn({ clientId: env.clientId, redirectUri, returnTo });
    const cookie = oauthStateCookie(
      encodeStateCookie({ nonce: begun.nonce, verifier: begun.codeVerifier, returnTo: begun.returnTo }),
    );
    redirect(c, begun.authorizeUrl, [cookie]);
  } catch (e) {
    console.error("[google-auth] start failed:", e instanceof Error ? e.message : e);
    redirectToLogin(c, returnTo, "google-failed", []);
  }
}

// GET /api/v1/auth/google/callback?code=&state= — Google's redirect back. Verifies the
// handshake, resolves the account, mints the session, lands the browser in the app.
export async function callback(c: RequestContext, limited: boolean, deps: CallbackDeps = realCallbackDeps): Promise<void> {
  // The state cookie is single-use: whatever happens next, it goes.
  const cleared = clearedOauthStateCookie();
  const state = decodeStateCookie(readCookie(c.req, OAUTH_STATE_COOKIE));
  const returnTo = sanitizeReturnTo(state?.returnTo);
  try {
    if (limited) return redirectToLogin(c, returnTo, "rate-limited", [cleared]);
    const env = googleEnv();
    if (!env) return redirectToLogin(c, returnTo, "google-unavailable", [cleared]);
    // The user pressed Cancel (or Google refused) — their choice, a calm bounce.
    if (c.query.error) {
      return redirectToLogin(c, returnTo, c.query.error === "access_denied" ? "google-denied" : "google-failed", [cleared]);
    }
    if (!state) return redirectToLogin(c, returnTo, "google-state", [cleared]);

    const redirectUri = `${requestBaseUrl(c.req)}/api/v1/auth/google/callback`;
    const { user, outcome } = await deps.svc.completeSignIn({
      clientId: env.clientId,
      code: c.query.code ?? "",
      state: c.query.state ?? "",
      cookieNonce: state.nonce,
      codeVerifier: state.verifier,
      redirectUri,
    });

    // Same signup side effects as the register form — and ONLY for a fresh signup.
    if (outcome === "signed-up") {
      deps.notifyRegistration(user);
      try {
        void deps.seed(user);
      } catch (e) {
        console.error("[demo-seed] failed to start:", e instanceof Error ? e.message : e);
      }
    } else if (outcome === "invite-accepted") {
      deps.notifyMember(user);
    }

    // Mint the SAME session password login mints (auth.controller.ts login) — from
    // here on the two doors are indistinguishable to the rest of the app.
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await deps.sessions.create({ token, userId: user.id, orgId: user.orgId, expiresAt });

    redirect(c, `${appBase(returnTo)}/`, [cleared, sessionCookie(token, SESSION_TTL_SECONDS)]);
  } catch (e) {
    if (e instanceof GoogleAuthError) return redirectToLogin(c, returnTo, e.code, [cleared]);
    console.error("[google-auth] callback failed:", e instanceof Error ? e.message : e);
    redirectToLogin(c, returnTo, "google-failed", [cleared]);
  }
}
