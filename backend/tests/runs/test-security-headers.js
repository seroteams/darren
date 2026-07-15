#!/usr/bin/env node
// personal-data-security Phase 2 (M-3): every response carries the security headers.
// Pins the header set + the HSTS prod-gate so a refactor can't silently drop them.
// FREE: pure header logic, no server, no DB.

const assert = require("node:assert");
const { setSecurityHeaders } = require("../../api/middleware/security-headers.ts");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}: ${e.message}`); }
}

// Minimal ServerResponse stand-in: capture setHeader calls.
function fakeRes() {
  const headers = {};
  return { headers, setHeader(k, v) { headers[k.toLowerCase()] = v; } };
}

check("sets the core headers on every response", () => {
  const res = fakeRes();
  setSecurityHeaders(res, false);
  assert.equal(res.headers["x-frame-options"], "DENY");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["referrer-policy"], "same-origin");
  assert.ok(res.headers["content-security-policy"], "CSP present");
});

check("CSP blocks framing and cross-origin scripts", () => {
  const res = fakeRes();
  setSecurityHeaders(res, true);
  const csp = res.headers["content-security-policy"];
  assert.ok(csp.includes("frame-ancestors 'none'"), "frame-ancestors none");
  assert.ok(csp.includes("script-src 'self'"), "script-src self");
  assert.ok(csp.includes("object-src 'none'"), "object-src none");
});

check("HSTS only in production", () => {
  const dev = fakeRes();
  setSecurityHeaders(dev, false);
  assert.equal(dev.headers["strict-transport-security"], undefined, "no HSTS in dev");

  const prod = fakeRes();
  setSecurityHeaders(prod, true);
  assert.ok(prod.headers["strict-transport-security"], "HSTS in prod");
});

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nsecurity-headers: all checks passed");
