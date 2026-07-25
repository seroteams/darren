// Google sign-in (google-signin Phase 1) — the pure logic behind "Continue with
// Google". Server-side OAuth 2.0 authorization-code flow with PKCE; zero new
// dependencies. Like auth.service.ts, this file never touches req/res, env or the
// network: the token exchanger (the only network edge) and the repo are injected,
// so every branch is unit-testable with fakes.
//
// Account resolution ladder — each branch independent, in this order:
//   (a) users.google_sub match          → login
//   (b) users.email match               → link the Google id, login (password untouched)
//   (c) pending invitation for the email → auto-accept into the inviting org as its role
//   (d) nobody                          → fresh signup: new org, role manager (mirrors register)
// Deactivated accounts are refused on (a)/(b) BEFORE any write — same policy as
// password login.

import { createHash, randomBytes } from "node:crypto";
import { normalizeEmail } from "./auth.service.ts";

/** Every way the flow can fail, as a stable code the login screen can translate
 *  into friendly copy. Union, not enum (type-stripping rule). */
export type GoogleErrorCode =
  | "google-unavailable" // GOOGLE_CLIENT_ID / SECRET not configured
  | "google-denied" // the user pressed Cancel on Google's screen
  | "google-state" // state/nonce mismatch or missing state cookie (CSRF fence)
  | "google-exchange" // code exchange refused — expired, replayed, or network
  | "google-verify" // id_token claims failed validation
  | "google-unverified" // Google reports the email as unverified
  | "account-off" // deactivatedAt is set — same policy as password login
  | "google-failed"; // anything unexpected

export class GoogleAuthError extends Error {
  readonly code: GoogleErrorCode;
  constructor(code: GoogleErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Where the browser goes after a successful sign-in. Allowlisted to exactly the
 *  two SPA roots — never a caller-supplied URL (no open redirect). */
export type GoogleReturnTo = "/" | "/admin";

/** A user as the Google flow reads them — no password hash (this flow never sees one). */
export interface GoogleUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
  deactivatedAt?: Date | null;
}

/** A pending invitation, just the bits auto-accept needs. */
export interface PendingInvite {
  id: string;
  orgId: string;
  role: string;
  personId: string | null;
}

export interface GoogleAuthRepo {
  /** The user already linked to this Google account id, or null. */
  findBySub(sub: string): Promise<GoogleUser | null>;
  /** The user with this (already-normalized) email, or null. */
  findByEmail(email: string): Promise<GoogleUser | null>;
  /** First Google sign-in on an existing account: remember the link. */
  linkSub(userId: string, sub: string): Promise<void>;
  /** The newest pending, unexpired invitation for this email, or null. */
  findPendingInviteByEmail(email: string): Promise<PendingInvite | null>;
  /** One transaction: member user (no password, Google-linked), roster link, invite burned. */
  acceptInviteWithGoogle(input: {
    inviteId: string;
    orgId: string;
    email: string;
    name: string;
    sub: string;
    role: string;
    personId: string | null;
  }): Promise<GoogleUser>;
  /** One transaction: new org + its manager owner (no password, Google-linked) —
   *  mirrors createOrgWithOwner in auth.repo.ts. */
  createOrgWithGoogleOwner(input: { company: string; email: string; name: string; sub: string }): Promise<GoogleUser>;
}

/** The one network edge, injected so tests never touch it. Returns null on ANY
 *  non-OK or malformed answer — a replayed or expired code lands there. */
export interface GoogleTokenExchanger {
  exchange(input: { code: string; redirectUri: string; codeVerifier: string }): Promise<{ idToken: string } | null>;
}

export type GoogleOutcome = "login" | "linked" | "invite-accepted" | "signed-up";

export interface GoogleSignInStart {
  authorizeUrl: string;
  nonce: string;
  codeVerifier: string;
  returnTo: GoogleReturnTo;
}

export interface GoogleSignInResult {
  user: GoogleUser;
  outcome: GoogleOutcome;
}

export interface GoogleAuthService {
  beginSignIn(input: { clientId: string; redirectUri: string; returnTo: string }): Promise<GoogleSignInStart>;
  completeSignIn(input: {
    clientId: string;
    code: string;
    state: string;
    cookieNonce: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GoogleSignInResult>;
}

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// Google issues either form depending on the flow version; both are theirs.
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

const sha256base64url = (s: string): string => createHash("sha256").update(s).digest("base64url");

/** Only "/" and "/admin" are real destinations; anything else collapses to "/". */
function sanitizeReturnTo(value: string): GoogleReturnTo {
  return value === "/admin" ? "/admin" : "/";
}

/** The claims we rely on, once validated. */
export interface ValidatedClaims {
  sub: string;
  email: string;
  name: string | null;
}

/** Validate the id_token payload. Signature verification is deliberately skipped:
 *  the token arrives in OUR OWN server-to-server TLS exchange with Google's token
 *  endpoint, so channel authenticity already proves the issuer (Google's docs
 *  sanction this for the code flow). If an id_token ever arrives from ANY other
 *  path, signature verification becomes mandatory. */
export function validateIdClaims(
  payload: Record<string, unknown>,
  opts: { clientId: string; nonce: string; now: number },
): ValidatedClaims {
  const iss = typeof payload.iss === "string" ? payload.iss : "";
  const aud = payload.aud;
  const audOk = Array.isArray(aud) ? aud.includes(opts.clientId) : aud === opts.clientId;
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const nonce = typeof payload.nonce === "string" ? payload.nonce : "";

  if (!GOOGLE_ISSUERS.has(iss)) throw new GoogleAuthError("google-verify");
  if (!audOk) throw new GoogleAuthError("google-verify");
  if (exp * 1000 <= opts.now) throw new GoogleAuthError("google-verify");
  if (!sub) throw new GoogleAuthError("google-verify");
  if (!email) throw new GoogleAuthError("google-verify");
  if (nonce !== opts.nonce) throw new GoogleAuthError("google-verify");
  // A hard requirement, with its own code: an unverified email must never create
  // or link an account (it could claim someone else's).
  if (payload.email_verified !== true) throw new GoogleAuthError("google-unverified");

  return { sub, email, name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null };
}

/** The payload segment of a JWT, decoded — or a google-verify error. */
function decodeJwtPayload(idToken: string): Record<string, unknown> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new GoogleAuthError("google-verify");
  try {
    const parsed: unknown = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new GoogleAuthError("google-verify");
  }
}

export function createGoogleAuthService(
  repo: GoogleAuthRepo,
  deps: { exchanger: GoogleTokenExchanger; now?: () => number },
): GoogleAuthService {
  const now = deps.now ?? Date.now;

  return {
    async beginSignIn(input) {
      const returnTo = sanitizeReturnTo(input.returnTo);
      // state doubles as the id_token nonce — one browser-bound secret proves both
      // "this callback answers OUR redirect" and "this token answers OUR request".
      const nonce = randomBytes(16).toString("hex");
      const codeVerifier = randomBytes(32).toString("base64url");
      const params = new URLSearchParams({
        client_id: input.clientId,
        redirect_uri: input.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state: nonce,
        nonce,
        code_challenge: sha256base64url(codeVerifier),
        code_challenge_method: "S256",
        // Always show the account picker — a manager with two Google accounts must
        // never be silently signed into the wrong one.
        prompt: "select_account",
      });
      return { authorizeUrl: `${GOOGLE_AUTHORIZE_URL}?${params}`, nonce, codeVerifier, returnTo };
    },

    async completeSignIn(input) {
      if (!input.cookieNonce || input.state !== input.cookieNonce) throw new GoogleAuthError("google-state");
      if (!input.code) throw new GoogleAuthError("google-exchange");

      const exchanged = await deps.exchanger.exchange({
        code: input.code,
        redirectUri: input.redirectUri,
        codeVerifier: input.codeVerifier,
      });
      if (!exchanged) throw new GoogleAuthError("google-exchange");

      const claims = validateIdClaims(decodeJwtPayload(exchanged.idToken), {
        clientId: input.clientId,
        nonce: input.cookieNonce,
        now: now(),
      });
      const email = normalizeEmail(claims.email);
      const name = claims.name ?? email.split("@")[0]!;

      // (a) Already linked — the stable key. users.email is deliberately NOT synced
      // when Google's email changes: email is the app's unique identity and syncing
      // could collide with another account.
      const bySub = await repo.findBySub(claims.sub);
      if (bySub) {
        if (bySub.deactivatedAt) throw new GoogleAuthError("account-off");
        return { user: bySub, outcome: "login" };
      }

      // (b) Same email, first Google visit — remember the link; the password (if any)
      // keeps working, both doors stay open.
      const byEmail = await repo.findByEmail(email);
      if (byEmail) {
        if (byEmail.deactivatedAt) throw new GoogleAuthError("account-off");
        await repo.linkSub(byEmail.id, claims.sub);
        return { user: byEmail, outcome: "linked" };
      }

      // (c) Invited but not yet joined — accepting via Google lands them in the
      // INVITING org, never a fresh one of their own.
      const invite = await repo.findPendingInviteByEmail(email);
      if (invite) {
        const user = await repo.acceptInviteWithGoogle({
          inviteId: invite.id,
          orgId: invite.orgId,
          email,
          name,
          sub: claims.sub,
          role: invite.role || "member",
          personId: invite.personId,
        });
        return { user, outcome: "invite-accepted" };
      }

      // (d) A stranger — same deal as the signup form: their own company, they manage it.
      const user = await repo.createOrgWithGoogleOwner({ company: `${name}'s Company`, email, name, sub: claims.sub });
      return { user, outcome: "signed-up" };
    },
  };
}
