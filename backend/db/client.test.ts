import test from "node:test";
import assert from "node:assert/strict";
import { poolConfig } from "./client.ts";

// Regression: 2026-07-08 — the dev API's pool starved and EVERY DB request hung
// forever (file endpoints fine, fresh process fine, restart fixed it). pg's
// defaults leave every wait unbounded: pool waiters never time out, and a query
// on a silently-dead socket waits forever with no keepalive to detect it. The
// pool must never be created with unbounded waits again.
test("poolConfig: bounds every wait so a wedged client surfaces as an error, not a hang", () => {
  const cfg = poolConfig("postgres://user:pw@host/db");
  assert.equal(cfg.connectionString, "postgres://user:pw@host/db");
  assert.ok((cfg.connectionTimeoutMillis ?? 0) > 0, "connect / pool-wait must time out");
  assert.ok((cfg.query_timeout ?? 0) > 0, "client-side query timeout required");
  assert.ok(Number(cfg.statement_timeout) > 0, "server-side statement timeout required");
  assert.equal(cfg.keepAlive, true, "TCP keepalive must detect dead sockets");
  assert.ok((cfg.max ?? 0) > 0, "pool size must be explicit");
  // The client-side timeout must fire AFTER the server-side one, so the normal
  // failure is a clean Postgres error, not a torn connection.
  assert.ok((cfg.query_timeout ?? 0) > Number(cfg.statement_timeout));
});
