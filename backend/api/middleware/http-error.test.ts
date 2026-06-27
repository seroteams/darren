import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HttpError,
  toErrorBody,
  errorStatus,
  badRequest,
  notFound,
  validationFailed,
} from "./http-error.ts";

test("HttpError carries status, code and message", () => {
  const e = new HttpError(404, "NOT_FOUND", "no such run");
  assert.equal(e.status, 404);
  assert.equal(e.code, "NOT_FOUND");
  assert.equal(e.message, "no such run");
  assert.ok(e instanceof Error);
});

test("toErrorBody wraps an HttpError in the one error shape", () => {
  const body = toErrorBody(new HttpError(400, "BAD_REQUEST", "bad input"));
  assert.deepEqual(body, { error: { code: "BAD_REQUEST", message: "bad input" } });
});

test("toErrorBody includes details only when present", () => {
  const body = toErrorBody(validationFailed("nope", { field: "name" }));
  assert.deepEqual(body, {
    error: { code: "VALIDATION_FAILED", message: "nope", details: { field: "name" } },
  });
});

test("toErrorBody maps a legacy { status } error to a code, keeping its message", () => {
  // The existing handlers throw Object.assign(new Error("Bad origin"), { status: 403 }).
  const legacy = Object.assign(new Error("Bad origin"), { status: 403 });
  assert.deepEqual(toErrorBody(legacy), {
    error: { code: "FORBIDDEN", message: "Bad origin" },
  });
});

test("toErrorBody masks 5xx detail behind a generic message + INTERNAL", () => {
  // Engine honesty: the raw error is logged by the responder, never sent to the client.
  const body = toErrorBody(new Error("stack-y internal blew up"));
  assert.deepEqual(body, { error: { code: "INTERNAL", message: "Internal error" } });
});

test("errorStatus reads HttpError and legacy status, defaulting unknowns to 500", () => {
  assert.equal(errorStatus(new HttpError(409, "CONFLICT", "dup")), 409);
  assert.equal(errorStatus(Object.assign(new Error("x"), { status: 413 })), 413);
  assert.equal(errorStatus("just a string"), 500);
});

test("factory helpers set the matching status and code", () => {
  assert.equal(badRequest("x").status, 400);
  assert.equal(badRequest("x").code, "BAD_REQUEST");
  assert.equal(notFound("x").status, 404);
  assert.equal(notFound("x").code, "NOT_FOUND");
});
