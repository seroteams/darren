import { test } from "node:test";
import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import type { RequestContext } from "../router.ts";
import { v1Route } from "./v1-route.ts";
import { notFound } from "./http-error.ts";

// A real-ish RequestContext whose json() captures the call (no casts needed).
function fakeCtx(): { ctx: RequestContext; calls: { status: number; data: unknown }[] } {
  const req = new IncomingMessage(new Socket());
  const res = new ServerResponse(req);
  const calls: { status: number; data: unknown }[] = [];
  const ctx: RequestContext = {
    req,
    res,
    url: new URL("http://localhost/api/v1/x"),
    query: {},
    params: {},
    readBody: async () => ({}),
    json: (status, data) => {
      calls.push({ status, data });
    },
    error: () => {},
  };
  return { ctx, calls };
}

test("v1Route passes a normal handler through untouched", async () => {
  const { ctx, calls } = fakeCtx();
  await v1Route((c) => c.json(200, { ok: true }))(ctx);
  assert.deepEqual(calls, [{ status: 200, data: { ok: true } }]);
});

test("v1Route formats a thrown HttpError into the one error shape + status", async () => {
  const { ctx, calls } = fakeCtx();
  await v1Route(() => {
    throw notFound("nope");
  })(ctx);
  assert.deepEqual(calls, [
    { status: 404, data: { error: { code: "NOT_FOUND", message: "nope" } } },
  ]);
});

test("v1Route masks an unknown throw as a 500 INTERNAL", async () => {
  const { ctx, calls } = fakeCtx();
  await v1Route(() => {
    throw new Error("secret boom");
  })(ctx);
  assert.deepEqual(calls, [
    { status: 500, data: { error: { code: "INTERNAL", message: "Internal error" } } },
  ]);
});
