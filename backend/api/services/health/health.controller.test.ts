import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRouter } from "../../router.ts";
import { health } from "./health.controller.ts";

// Render's health check (and the /release watch loop) polls GET /api/v1/health
// anonymously. It must answer 200 {"ok":true} with no auth and no I/O — through
// the real router, the same path a live request takes.

function fakeReq(method: string, url: string): IncomingMessage {
  return { method, url, headers: { host: "localhost" }, on() {} } as unknown as IncomingMessage;
}

function fakeRes(): ServerResponse & { status: number | null; body: string } {
  const res = {
    status: null as number | null,
    body: "",
    writeHead(status: number) {
      this.status = status;
      return this;
    },
    end(chunk?: string) {
      if (chunk) this.body += chunk;
      return this;
    },
  };
  return res as unknown as ServerResponse & { status: number | null; body: string };
}

test("health: GET /api/v1/health answers 200 {ok:true} with no auth", async () => {
  const router = createRouter();
  router.add("GET", "/api/v1/health", health);

  const res = fakeRes();
  await router.handle(fakeReq("GET", "/api/v1/health"), res);

  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
});
