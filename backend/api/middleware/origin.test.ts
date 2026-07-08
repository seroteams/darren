import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { originOk } from "./origin.ts";

// The origin guard fences every mutating route. Before Render, it only knew
// localhost — so on a real host (sero.onrender.com) every browser POST carried
// Origin: https://sero.onrender.com and got 403 "Bad origin". The rule now:
// no Origin passes (curl/scripts), localhost passes (dev), and an Origin whose
// host matches the request's own Host header passes (the served SPA talking to
// its own server). Anything else — another site — is still refused.

function req(headers: Record<string, string | undefined>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

test("origin: no Origin header passes (curl, server-to-server)", () => {
  assert.equal(originOk(req({ host: "sero.onrender.com" })), true);
});

test("origin: localhost dev origins pass", () => {
  assert.equal(originOk(req({ origin: "http://localhost:3000", host: "localhost:3001" })), true);
  assert.equal(originOk(req({ origin: "http://127.0.0.1:3000", host: "localhost:3001" })), true);
});

test("origin: the site's own origin passes on a real host (the Render case)", () => {
  assert.equal(
    originOk(req({ origin: "https://sero.onrender.com", host: "sero.onrender.com" })),
    true,
  );
});

test("origin: a different site's origin is refused", () => {
  assert.equal(
    originOk(req({ origin: "https://evil.example.com", host: "sero.onrender.com" })),
    false,
  );
});

test("origin: a malformed Origin header is refused", () => {
  assert.equal(originOk(req({ origin: "not a url", host: "sero.onrender.com" })), false);
});

test("origin: same hostname but different port is refused", () => {
  assert.equal(
    originOk(req({ origin: "https://sero.onrender.com:8443", host: "sero.onrender.com" })),
    false,
  );
});
