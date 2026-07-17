import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldStall } from "./stream-helper.ts";

// The dev-only stall switch (SERO_STALL_STAGE) makes one stage hang on purpose
// so the client's 60s watchdog is walkable without waiting for a rare real
// stall. It must be impossible to arm in production — it would hang a real
// manager's 1:1 forever.

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    prev[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

test("stall switch arms only the named stage", () => {
  withEnv({ NODE_ENV: "development", SERO_STALL_STAGE: "preparation" }, () => {
    assert.equal(shouldStall("preparation"), true, "the named stage stalls");
    assert.equal(shouldStall("focus-points"), false, "other stages are untouched");
  });
});

test("stall switch is inert in production", () => {
  withEnv({ NODE_ENV: "production", SERO_STALL_STAGE: "preparation" }, () => {
    assert.equal(shouldStall("preparation"), false, "must never hang a real manager's 1:1");
  });
});

test("stall switch is off when unset", () => {
  withEnv({ NODE_ENV: "development", SERO_STALL_STAGE: undefined }, () => {
    assert.equal(shouldStall("preparation"), false);
  });
  withEnv({ NODE_ENV: "development", SERO_STALL_STAGE: "" }, () => {
    assert.equal(shouldStall("preparation"), false, "empty string is not a stage name");
  });
});
