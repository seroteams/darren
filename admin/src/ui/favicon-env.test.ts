import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalHost, localFaviconHref } from "./favicon-env.ts";

// The browser tab icon is the brand mark: sky-blue tile on the live sites, the
// charcoal tile on a developer's own machine, so a local tab is never mistaken
// for the real one (Carl, 2026-07-29).

test("a developer's own machine is local", () => {
  for (const host of ["localhost", "127.0.0.1", "0.0.0.0", "::1", "sero.local"]) {
    assert.equal(isLocalHost(host), true, `${host} is local`);
  }
});

test("the live sites are not local", () => {
  for (const host of ["sero.team", "www.sero.team", "sero-admin.onrender.com"]) {
    assert.equal(isLocalHost(host), false, `${host} is live`);
  }
});

test("the local href is derived from whatever the page already points at", () => {
  assert.equal(localFaviconHref("/favicon.svg"), "/favicon-local.svg");
  // Vite's base path (the admin app is served under /admin/) has to survive.
  assert.equal(localFaviconHref("/admin/favicon.svg"), "/admin/favicon-local.svg");
});

test("an href that is already the local mark is left alone", () => {
  assert.equal(localFaviconHref("/favicon-local.svg"), "/favicon-local.svg");
});
