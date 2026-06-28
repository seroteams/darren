// The one error shape every /api/v1 route returns on failure (Phase 004 step 2 —
// shared plumbing). v1 routes adopt it in step 3; the legacy /api/ alias keeps its
// current { error: string } shape until the admin migrates (decision D2 — no admin
// caller changes this phase). Engine honesty: 5xx detail is masked behind a generic
// message here and logged by the responder, never sent to the client.

/** A stable, machine-readable error code (mirrors the contract's code list). */
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "BODY_TOO_LARGE"
  | "RATE_LIMITED"
  | "BAD_ORIGIN"
  | "INTERNAL";

/** The wire body for any failed request. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/** An error carrying the HTTP status + stable code to the responder. Type-stripping
 *  safe: fields declared and assigned in the constructor (no parameter properties /
 *  enums — they break Node's native .ts runner). */
export class HttpError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "BODY_TOO_LARGE";
    case 422:
      return "VALIDATION_FAILED";
    case 429:
      return "RATE_LIMITED";
    default:
      return "INTERNAL";
  }
}

/** Map any thrown value to its HTTP status. Honours HttpError and the existing
 *  house pattern `Object.assign(new Error(msg), { status })`. Defaults to 500. */
export function errorStatus(err: unknown): number {
  if (err instanceof HttpError) return err.status;
  if (isRecord(err) && typeof err.status === "number") return err.status;
  return 500;
}

/** Map any thrown value to the one error body. 5xx are masked to a generic message
 *  (the raw error is logged by the responder, not sent to the client). */
export function toErrorBody(err: unknown): ApiErrorBody {
  if (err instanceof HttpError) {
    const error: ApiErrorBody["error"] = { code: err.code, message: err.message };
    if (err.details !== undefined) error.details = err.details;
    return { error };
  }
  const status = errorStatus(err);
  if (status >= 500) {
    return { error: { code: "INTERNAL", message: "Internal error" } };
  }
  const message =
    (isRecord(err) && typeof err.message === "string" && err.message) || "Request failed";
  return { error: { code: codeForStatus(status), message } };
}

// Factory helpers — services throw these so controllers stay thin. Add more from
// the ErrorCode list as services need them; kept lean to avoid speculative code.
export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, "BAD_REQUEST", message, details);
}
export function unauthenticated(message = "Not signed in"): HttpError {
  return new HttpError(401, "UNAUTHENTICATED", message);
}
export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, "FORBIDDEN", message);
}
export function notFound(message = "Not found"): HttpError {
  return new HttpError(404, "NOT_FOUND", message);
}
export function conflict(message: string, details?: unknown): HttpError {
  return new HttpError(409, "CONFLICT", message, details);
}
export function rateLimited(message = "Rate limit exceeded"): HttpError {
  return new HttpError(429, "RATE_LIMITED", message);
}
export function validationFailed(message: string, details?: unknown): HttpError {
  return new HttpError(422, "VALIDATION_FAILED", message, details);
}
