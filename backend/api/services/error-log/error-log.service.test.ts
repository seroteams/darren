import test from "node:test";
import assert from "node:assert/strict";
import { createErrorLogService } from "./error-log.service.ts";
import type { ErrorLogRow, ErrorLogReadRepo } from "./error-log.repo.ts";

function row(over: Partial<ErrorLogRow> = {}): ErrorLogRow {
  return {
    id: "e1", environment: "local", source: "api", email: "a@b.com", userName: "A", company: "Acme",
    method: "POST", path: "/api/v1/sessions", status: 500, errorCode: "INTERNAL",
    message: "boom", createdAt: new Date("2026-07-05T06:00:00Z"), ...over,
  };
}
function fakeRepo(rows: ErrorLogRow[]): ErrorLogReadRepo {
  return { async listRecent() { return rows; } };
}

test("listRecent: maps rows to the view with createdAt as an ISO string", async () => {
  const svc = createErrorLogService(fakeRepo([row()]));
  const { errors } = await svc.listRecent();
  assert.equal(errors.length, 1);
  const e = errors[0];
  assert.ok(e);
  assert.equal(e.createdAt, "2026-07-05T06:00:00.000Z");
  assert.equal(e.environment, "local");
  assert.equal(e.message, "boom");
});

test("listRecent: preserves the repo's newest-first order", async () => {
  const newer = row({ id: "new", createdAt: new Date("2026-07-05T07:00:00Z") });
  const older = row({ id: "old", createdAt: new Date("2026-07-05T05:00:00Z") });
  const svc = createErrorLogService(fakeRepo([newer, older])); // repo already ordered newest-first
  const { errors } = await svc.listRecent();
  assert.deepEqual(errors.map((e) => e.id), ["new", "old"]);
});

test("listRecent: an anonymous error (null who) passes through", async () => {
  const svc = createErrorLogService(fakeRepo([row({ email: null, userName: null, company: null })]));
  const { errors } = await svc.listRecent();
  const e = errors[0];
  assert.ok(e);
  assert.equal(e.email, null);
  assert.equal(e.userName, null);
  assert.equal(e.company, null);
});
