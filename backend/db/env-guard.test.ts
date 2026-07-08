import test from "node:test";
import assert from "node:assert/strict";
import { resolveAppEnv, evaluateEnvGuard, runEnvironmentGuard } from "./env-guard.ts";

function withEnv(vars: Record<string, string | undefined>, fn: () => void | Promise<void>): void | Promise<void> {
  const saved = new Map<string, string | undefined>();
  for (const key of Object.keys(vars)) {
    saved.set(key, process.env[key]);
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  const restore = () => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  try {
    const out = fn();
    if (out instanceof Promise) return out.finally(restore);
    restore();
  } catch (e) {
    restore();
    throw e;
  }
}

test("resolveAppEnv: APP_ENV=live → live, APP_ENV=local → local", () => {
  withEnv({ APP_ENV: "live" }, () => assert.equal(resolveAppEnv(), "live"));
  withEnv({ APP_ENV: "local" }, () => assert.equal(resolveAppEnv(), "local"));
});

test("resolveAppEnv: unset falls back to NODE_ENV (production → live, else local)", () => {
  withEnv({ APP_ENV: undefined, NODE_ENV: "production" }, () => assert.equal(resolveAppEnv(), "live"));
  withEnv({ APP_ENV: undefined, NODE_ENV: "development" }, () => assert.equal(resolveAppEnv(), "local"));
  withEnv({ APP_ENV: undefined, NODE_ENV: undefined }, () => assert.equal(resolveAppEnv(), "local"));
});

test("resolveAppEnv: an unknown APP_ENV value refuses loudly (no silent guess)", () => {
  withEnv({ APP_ENV: "prod" }, () => {
    assert.throws(() => resolveAppEnv(), /APP_ENV/);
  });
});

test("evaluateEnvGuard: a fresh database gets claimed for this environment", () => {
  const d = evaluateEnvGuard({ appEnv: "local", dbEnv: null, allowMismatch: false });
  assert.equal(d.action, "claim");
});

test("evaluateEnvGuard: matching environments boot normally", () => {
  const d = evaluateEnvGuard({ appEnv: "live", dbEnv: "live", allowMismatch: false });
  assert.equal(d.action, "ok");
});

test("evaluateEnvGuard: mismatch refuses with a plain-English message naming both sides", () => {
  const d = evaluateEnvGuard({ appEnv: "local", dbEnv: "live", allowMismatch: false });
  assert.equal(d.action, "mismatch");
  if (d.action === "mismatch") {
    assert.match(d.message, /live/);
    assert.match(d.message, /local/);
    assert.match(d.message, /\.env/);
  }
});

test("evaluateEnvGuard: ALLOW_ENV_MISMATCH lets a deliberate mismatch through (backfill escape hatch)", () => {
  const d = evaluateEnvGuard({ appEnv: "local", dbEnv: "live", allowMismatch: true });
  assert.equal(d.action, "allowed-mismatch");
});

test("runEnvironmentGuard: a no-op without DATABASE_URL (file mode keeps working)", async () => {
  await withEnv({ DATABASE_URL: undefined }, async () => {
    const result = await runEnvironmentGuard(); // must resolve, not throw, and never touch a DB
    assert.equal(result.skipped, true);
  });
});
