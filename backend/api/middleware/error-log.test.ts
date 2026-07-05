import test from "node:test";
import assert from "node:assert/strict";
import { errorLogEntry, browserErrorEntry, resolveEnvironment, logApiError } from "./error-log.ts";
import { HttpError } from "./http-error.ts";
import { anonymousIdentity } from "./request-context.ts";
import type { RequestIdentity } from "./request-context.ts";

const REAL_UUID = "11111111-2222-3333-4444-555555555555";
function identity(over: Partial<RequestIdentity> = {}): RequestIdentity {
  return { userId: REAL_UUID, orgId: REAL_UUID, roles: ["manager"], email: "a@b.com", name: "A", ...over };
}
const facts = { method: "POST", path: "/api/v1/sessions", status: 500, environment: "local" as const };

test("errorLogEntry: tags source api and carries env + who + where + status", () => {
  const e = errorLogEntry(identity(), facts, new Error("boom"));
  assert.equal(e.source, "api");
  assert.equal(e.environment, "local");
  assert.equal(e.orgId, REAL_UUID);
  assert.equal(e.userId, REAL_UUID);
  assert.equal(e.email, "a@b.com");
  assert.equal(e.method, "POST");
  assert.equal(e.path, "/api/v1/sessions");
  assert.equal(e.status, 500);
  assert.equal(e.message, "boom");
});

test("errorLogEntry: keeps the real message + stack (superadmin log, not the client)", () => {
  const err = new Error("OpenAI request timed out");
  const e = errorLogEntry(identity(), facts, err);
  assert.equal(e.message, "OpenAI request timed out");
  assert.ok(e.details?.stack?.includes("OpenAI request timed out"));
});

test("errorLogEntry: picks up an HttpError's stable code; plain Error has none", () => {
  const withCode = errorLogEntry(identity(), facts, new HttpError(500, "INTERNAL", "nope"));
  assert.equal(withCode.errorCode, "INTERNAL");
  const plain = errorLogEntry(identity(), facts, new Error("x"));
  assert.equal(plain.errorCode, null);
});

test("errorLogEntry: nulls non-uuid identity (dev side-door) but keeps email", () => {
  const e = errorLogEntry(
    identity({ userId: "dev-user", orgId: "dev-org", email: "dev@seroteams.com" }),
    facts,
    new Error("x"),
  );
  assert.equal(e.userId, null);
  assert.equal(e.orgId, null);
  assert.equal(e.email, "dev@seroteams.com");
});

test("errorLogEntry: an anonymous request records with null who", () => {
  const e = errorLogEntry(anonymousIdentity(), facts, new Error("x"));
  assert.equal(e.userId, null);
  assert.equal(e.orgId, null);
  assert.equal(e.email, null);
});

test("resolveEnvironment: an explicit override wins, else NODE_ENV decides", () => {
  const save = { app: process.env.APP_ENV, sero: process.env.SERO_ENV, node: process.env.NODE_ENV };
  try {
    process.env.APP_ENV = "production";
    assert.equal(resolveEnvironment(), "production");
    process.env.APP_ENV = "local";
    assert.equal(resolveEnvironment(), "local");
    delete process.env.APP_ENV;
    delete process.env.SERO_ENV;
    process.env.NODE_ENV = "production";
    assert.equal(resolveEnvironment(), "production");
    process.env.NODE_ENV = "development";
    assert.equal(resolveEnvironment(), "local");
  } finally {
    if (save.app === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = save.app;
    if (save.sero === undefined) delete process.env.SERO_ENV;
    else process.env.SERO_ENV = save.sero;
    if (save.node === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = save.node;
  }
});

test("logApiError: never throws, and is a no-op when no database is configured", async () => {
  const save = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    await logApiError(undefined, new Error("boom"), 500); // must resolve, not throw
  } finally {
    if (save === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = save;
  }
});

test("browserErrorEntry: tags source browser, no method/status, carries env + who + user-agent", () => {
  const e = browserErrorEntry(identity(), { message: "Blank screen", path: "/interview", userAgent: "UA/1" }, "production");
  assert.equal(e.source, "browser");
  assert.equal(e.environment, "production");
  assert.equal(e.method, null);
  assert.equal(e.status, null);
  assert.equal(e.path, "/interview");
  assert.equal(e.message, "Blank screen");
  assert.equal(e.email, "a@b.com");
  assert.equal(e.details?.userAgent, "UA/1");
});

test("browserErrorEntry: caps message + path length, nulls dev side-door ids, no ua → no details", () => {
  const e = browserErrorEntry(
    identity({ userId: "dev-user", orgId: "dev-org" }),
    { message: "x".repeat(5000), path: "p".repeat(5000), userAgent: null },
    "local",
  );
  assert.equal(e.message.length, 2000);
  assert.equal(e.path.length, 300);
  assert.equal(e.userId, null);
  assert.equal(e.orgId, null);
  assert.equal(e.details, null);
});
