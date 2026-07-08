import test from "node:test";
import assert from "node:assert/strict";
import { shouldEchoToDisk, queueArtifact, flushArtifactWrites } from "./run-artifacts-store.ts";

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const saved = new Map<string, string | undefined>();
  for (const k of Object.keys(vars)) {
    saved.set(k, process.env[k]);
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("shouldEchoToDisk: on locally, off in live, overridable by RUN_FILE_ECHO", () => {
  withEnv({ RUN_FILE_ECHO: undefined, APP_ENV: "local" }, () => assert.equal(shouldEchoToDisk(), true));
  withEnv({ RUN_FILE_ECHO: undefined, APP_ENV: "live" }, () => assert.equal(shouldEchoToDisk(), false));
  withEnv({ RUN_FILE_ECHO: undefined, APP_ENV: undefined }, () => assert.equal(shouldEchoToDisk(), true));
  withEnv({ RUN_FILE_ECHO: "0", APP_ENV: "local" }, () => assert.equal(shouldEchoToDisk(), false));
  withEnv({ RUN_FILE_ECHO: "on", APP_ENV: "live" }, () => assert.equal(shouldEchoToDisk(), true));
});

test("queueArtifact + flush: a no-op without DATABASE_URL, and flush resolves", async () => {
  await withEnvAsync({ DATABASE_URL: undefined }, async () => {
    // No database configured → queueArtifact does nothing and flush resolves cleanly.
    queueArtifact({ sessionKey: "k1", stage: "01-x", name: "response.json", kind: "text", contentText: "hi" });
    await flushArtifactWrites();
    assert.ok(true);
  });
});

// async env helper (queue paths are async)
async function withEnvAsync(vars: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const saved = new Map<string, string | undefined>();
  for (const k of Object.keys(vars)) {
    saved.set(k, process.env[k]);
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    await fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
