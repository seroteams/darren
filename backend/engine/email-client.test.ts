import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sendEmail, sendEmailQuietly } from "./email-client.ts";

// We stub global.fetch so no real network happens. Each test sets its own stub and
// captures what the client tried to send.
const realFetch = global.fetch;
const realKey = process.env.EMAIL_API_KEY;
const realFrom = process.env.EMAIL_FROM;

afterEach(() => {
  global.fetch = realFetch;
  if (realKey === undefined) delete process.env.EMAIL_API_KEY;
  else process.env.EMAIL_API_KEY = realKey;
  if (realFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = realFrom;
});

function okResponse(): Response {
  return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
}

test("sendEmail POSTs to Resend with the bearer key and the message body", async () => {
  process.env.EMAIL_API_KEY = "re_test_key";
  process.env.EMAIL_FROM = "Sero <notifications@seroteams.com>";
  let capturedUrl = "";
  let capturedInit: RequestInit = {};
  global.fetch = (async (url: string, init: RequestInit) => {
    capturedUrl = String(url);
    capturedInit = init;
    return okResponse();
  }) as typeof fetch;

  await sendEmail({ to: "carl@seroteams.com", subject: "Hi", html: "<p>hello</p>" });

  assert.equal(capturedUrl, "https://api.resend.com/emails");
  assert.equal(capturedInit.method, "POST");
  const headers = capturedInit.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer re_test_key");
  assert.equal(headers["Content-Type"], "application/json");
  const body = JSON.parse(String(capturedInit.body));
  assert.equal(body.from, "Sero <notifications@seroteams.com>");
  assert.equal(body.to, "carl@seroteams.com");
  assert.equal(body.subject, "Hi");
  assert.equal(body.html, "<p>hello</p>");
});

test("sendEmail throws when EMAIL_API_KEY is not set", async () => {
  delete process.env.EMAIL_API_KEY;
  await assert.rejects(
    () => sendEmail({ to: "a@b.com", subject: "x", html: "<p>x</p>" }),
    /EMAIL_API_KEY not set/,
  );
});

test("sendEmail retries on a 429 then succeeds", async () => {
  process.env.EMAIL_API_KEY = "re_test_key";
  let calls = 0;
  global.fetch = (async () => {
    calls++;
    if (calls === 1) {
      return new Response("rate limited", { status: 429, headers: { "retry-after": "0" } });
    }
    return okResponse();
  }) as typeof fetch;

  await sendEmail({ to: "a@b.com", subject: "x", html: "<p>x</p>" });
  assert.equal(calls, 2, "should retry once after the 429");
});

test("sendEmail throws on a non-retryable 4xx", async () => {
  process.env.EMAIL_API_KEY = "re_test_key";
  global.fetch = (async () => new Response("bad request", { status: 422 })) as typeof fetch;
  await assert.rejects(
    () => sendEmail({ to: "a@b.com", subject: "x", html: "<p>x</p>" }),
    /Resend 422/,
  );
});

test("sendEmailQuietly never throws, even when the send fails", async () => {
  delete process.env.EMAIL_API_KEY; // guaranteed failure path
  // Must not throw synchronously and must not reject an unhandled promise.
  assert.doesNotThrow(() => sendEmailQuietly({ to: "a@b.com", subject: "x", html: "<p>x</p>" }));
  // Give the fire-and-forget promise a tick to settle.
  await new Promise((r) => setTimeout(r, 10));
});
