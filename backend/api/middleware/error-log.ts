// Error-log capture (error-log Phase 1 + 3). Mirrors superadmin-audit.ts: pure entry
// builders + sinks in one file. Every API 5xx (Phase 1) and every reported browser error
// (Phase 3) writes one row to the error_logs table so the superadmin Error log screen can
// show what broke — across Carl's local dev and the published live Sero (the `environment`
// tag).
//
// Honesty + safety rules, non-negotiable:
//  - Never records a secret: identity + method + path + status + code + message + stack
//    (or, for browser errors, the user-agent) only — never a request body, password,
//    token, or cookie.
//  - Fire-and-forget and swallows its own failures, so logging can never slow down or
//    break a user's response. The responder's console.error stays as the backstop for
//    the one case this can't cover (the DB itself being unreachable).

import type { IncomingMessage } from "node:http";
import { getDb, hasDatabaseUrl } from "../../db/client.ts";
import { errorLogs } from "../../db/schema.ts";
import { buildIdentity, anonymousIdentity } from "./request-context.ts";
import type { RequestIdentity } from "./request-context.ts";
import { HttpError } from "./http-error.ts";
import type { ErrorCode } from "./http-error.ts";

export type ErrorEnvironment = "local" | "production";

/** One captured error, shaped to the error_logs columns (id / created_at default in DB). */
export interface ErrorLogEntry {
  orgId: string | null;
  userId: string | null;
  email: string | null;
  environment: ErrorEnvironment;
  source: "api" | "browser";
  method: string | null;
  path: string;
  status: number | null;
  errorCode: ErrorCode | null;
  message: string;
  details: { stack?: string; userAgent?: string } | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keep a value only if it's a real uuid, else null. Guards the FK columns against the
 *  dev side-door's synthetic identity ("dev-user" / "dev-org"), which isn't a uuid — we
 *  still record the row (email carries who), just without an invalid FK. */
function asUuidOrNull(v: string | null): string | null {
  return v && UUID_RE.test(v) ? v : null;
}

/** local vs the published live Sero. An explicit APP_ENV/SERO_ENV wins; otherwise the
 *  NODE_ENV the process started with (the `dev` script → local, `start` → production). */
export function resolveEnvironment(): ErrorEnvironment {
  const explicit = (process.env.APP_ENV || process.env.SERO_ENV || "").toLowerCase();
  if (explicit === "production" || explicit === "live") return "production";
  if (explicit === "local" || explicit === "development" || explicit === "dev") return "local";
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return "Unknown error";
}

function codeOf(err: unknown): ErrorCode | null {
  return err instanceof HttpError ? err.code : null;
}

/** Build the row from identity + request facts + the thrown error. Pure and secret-free:
 *  the real message + stack are kept (this log is superadmin-only), never a body/token. */
export function errorLogEntry(
  identity: RequestIdentity,
  facts: { method: string | null; path: string; status: number; environment: ErrorEnvironment },
  err: unknown,
): ErrorLogEntry {
  const stack = err instanceof Error && err.stack ? err.stack : null;
  return {
    orgId: asUuidOrNull(identity.orgId),
    userId: asUuidOrNull(identity.userId),
    email: identity.email,
    environment: facts.environment,
    source: "api",
    method: facts.method,
    path: facts.path,
    status: facts.status,
    errorCode: codeOf(err),
    message: messageOf(err),
    details: stack ? { stack } : null,
  };
}

/** Build a browser-side error row (a client crash / failed load the app reported, Phase 3).
 *  Same secret-free shape, but source "browser" and no HTTP method/status. message + path
 *  are length-capped; details carries only the user-agent, never form data. */
export function browserErrorEntry(
  identity: RequestIdentity,
  input: { message: string; path: string; userAgent: string | null },
  environment: ErrorEnvironment,
): ErrorLogEntry {
  return {
    orgId: asUuidOrNull(identity.orgId),
    userId: asUuidOrNull(identity.userId),
    email: identity.email,
    environment,
    source: "browser",
    method: null,
    path: (input.path || "(unknown)").slice(0, 300),
    status: null,
    errorCode: null,
    message: (input.message || "Unknown client error").slice(0, 2000),
    details: input.userAgent ? { userAgent: input.userAgent.slice(0, 400) } : null,
  };
}

/** The route path without its query string (the query can carry ids we don't need). */
function pathOf(req: IncomingMessage | undefined): string {
  if (!req?.url) return "(unknown)";
  const q = req.url.indexOf("?");
  return q === -1 ? req.url : req.url.slice(0, q);
}

/** Capture one API 5xx. Called fire-and-forget from the responder — never awaited on
 *  the user's path, never throws. Identity is best-effort (anonymous on any failure,
 *  including the DB being the thing that broke). A no-DB dev run is a silent no-op:
 *  console.error is the record there. */
export async function logApiError(
  req: IncomingMessage | undefined,
  err: unknown,
  status: number,
): Promise<void> {
  try {
    if (!hasDatabaseUrl()) return;
    let identity: RequestIdentity;
    try {
      identity = req ? await buildIdentity(req) : anonymousIdentity();
    } catch {
      identity = anonymousIdentity();
    }
    const entry = errorLogEntry(
      identity,
      { method: req?.method ?? null, path: pathOf(req), status, environment: resolveEnvironment() },
      err,
    );
    await getDb().insert(errorLogs).values(entry);
  } catch (writeErr) {
    console.error("[error-log] failed to record error:", writeErr);
  }
}

/** Record a client-side error the app reported (POST /api/v1/errors, Phase 3). Best-effort
 *  + self-swallowing like logApiError — a failed write must never turn a report into a new
 *  error. Identity comes from the session cookie (anonymous if none). */
export async function reportBrowserError(
  req: IncomingMessage,
  input: { message: string; path: string },
): Promise<void> {
  try {
    if (!hasDatabaseUrl()) return;
    let identity: RequestIdentity;
    try {
      identity = await buildIdentity(req);
    } catch {
      identity = anonymousIdentity();
    }
    const ua = req.headers["user-agent"];
    const entry = browserErrorEntry(
      identity,
      { message: input.message, path: input.path, userAgent: typeof ua === "string" ? ua : null },
      resolveEnvironment(),
    );
    await getDb().insert(errorLogs).values(entry);
  } catch (writeErr) {
    console.error("[error-log] failed to record browser error:", writeErr);
  }
}
