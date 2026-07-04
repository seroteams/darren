import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRouter } from "./router.ts";

// The router matches string patterns EXACTLY and only extracts params from RegExp
// patterns (named groups). PG8's user-runs route was first registered as the string
// "/api/v1/admin/users/:id/runs" and 404'd on every real id because ":id" is literal.
// These drive the real handle() so that contract can't regress silently.

function fakeReq(method: string, url: string): IncomingMessage {
  return { method, url, headers: { host: "localhost" }, on() {} } as unknown as IncomingMessage;
}

function fakeRes(): ServerResponse & { status: number | null } {
  const res = {
    status: null as number | null,
    writeHead(status: number) {
      this.status = status;
      return this;
    },
    end() {
      return this;
    },
  };
  return res as unknown as ServerResponse & { status: number | null };
}

test("router: a RegExp named-group route captures :id from a real path", async () => {
  const router = createRouter();
  const seen: { params: Record<string, string> | null } = { params: null };
  router.add("GET", /^\/api\/v1\/admin\/users\/(?<id>[^/]+)\/runs$/, (c) => {
    seen.params = c.params;
    c.json(200, { ok: true });
  });

  const res = fakeRes();
  await router.handle(fakeReq("GET", "/api/v1/admin/users/u1/runs"), res);

  assert.equal(res.status, 200);
  // regex named groups arrive as a null-prototype object — assert the value, not the shape
  assert.equal(seen.params?.id, "u1");
});

test("router: an Express-style string ':id' pattern does NOT match a real id (the PG8 gotcha)", async () => {
  const router = createRouter();
  let ran = false;
  router.add("GET", "/api/v1/admin/users/:id/runs", () => {
    ran = true;
  });

  const res = fakeRes();
  await router.handle(fakeReq("GET", "/api/v1/admin/users/u1/runs"), res);

  // ":id" is literal in a string pattern, so a real id falls through to 404.
  assert.equal(ran, false);
  assert.equal(res.status, 404);
});
