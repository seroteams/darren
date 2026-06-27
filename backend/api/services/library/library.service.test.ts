import { test } from "node:test";
import assert from "node:assert/strict";
import { createLibraryService } from "./library.service.ts";

const service = createLibraryService();

test("a bare path asks for a redirect (to add the trailing slash)", () => {
  assert.equal(service.plan(undefined).kind, "redirect");
  assert.equal(service.plan("").kind, "redirect");
});

test("'/' resolves to index.html and serves as html", () => {
  const p = service.plan("/");
  assert.equal(p.kind, "serve");
  if (p.kind === "serve") {
    assert.match(p.filePath, /index\.html$/);
    assert.match(p.mime, /text\/html/);
  }
});

test("a path-traversal attempt is forbidden", () => {
  assert.equal(service.plan("/../../etc/passwd").kind, "forbidden");
  assert.equal(service.plan("/../secret.json").kind, "forbidden");
});

test("an unknown extension serves as octet-stream", () => {
  const p = service.plan("/june/run-1/blob.bin");
  assert.equal(p.kind, "serve");
  if (p.kind === "serve") assert.equal(p.mime, "application/octet-stream");
});
