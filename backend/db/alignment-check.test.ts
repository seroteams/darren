import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAlignment, type DbSnapshot, type RepoMigrations } from "./alignment-check.ts";

const REPO: RepoMigrations = { count: 13, headTag: "0012_alignment_probe", headWhen: 1783600000000 };

function snapshot(overrides: Partial<DbSnapshot> = {}): DbSnapshot {
  return {
    reachable: true,
    envMarker: "local",
    migrationCount: 13,
    migrationHeadWhen: 1783600000000,
    probePresent: true,
    ...overrides,
  };
}

function byName(checks: { name: string; ok: boolean; detail: string }[], name: string) {
  const found = checks.find((c) => c.name === name);
  assert.ok(found, `missing check "${name}" — got: ${checks.map((c) => c.name).join(", ")}`);
  return found;
}

test("evaluateAlignment: both databases aligned with the repo → every check passes", () => {
  const checks = evaluateAlignment({
    repo: REPO,
    local: snapshot(),
    live: snapshot({ envMarker: "live" }),
  });
  assert.ok(checks.length > 0, "expected a non-empty list of checks");
  for (const c of checks) assert.ok(c.ok, `expected "${c.name}" to pass, got: ${c.detail}`);
});

test("evaluateAlignment: live behind the repo → live migration + probe checks fail, local stays green", () => {
  const checks = evaluateAlignment({
    repo: REPO,
    local: snapshot(),
    live: snapshot({
      envMarker: "live",
      migrationCount: 12,
      migrationHeadWhen: 1783490628319,
      probePresent: false,
    }),
  });
  assert.equal(byName(checks, "live: migrations match the repo").ok, false);
  assert.equal(byName(checks, "live: alignment probe row present").ok, false);
  assert.equal(byName(checks, "live and local: same migration head").ok, false);
  assert.equal(byName(checks, "local: migrations match the repo").ok, true);
  assert.equal(byName(checks, "local: alignment probe row present").ok, true);
});

test("evaluateAlignment: swapped environment markers are flagged on both sides", () => {
  const checks = evaluateAlignment({
    repo: REPO,
    local: snapshot({ envMarker: "live" }),
    live: snapshot({ envMarker: "local" }),
  });
  assert.equal(byName(checks, 'local: environment marker is "local"').ok, false);
  assert.equal(byName(checks, 'live: environment marker is "live"').ok, false);
});

test("evaluateAlignment: an unclaimed database (no marker yet) fails the marker check honestly", () => {
  const checks = evaluateAlignment({
    repo: REPO,
    local: snapshot({ envMarker: null }),
    live: snapshot({ envMarker: "live" }),
  });
  const check = byName(checks, 'local: environment marker is "local"');
  assert.equal(check.ok, false);
  assert.match(check.detail, /never claimed|no marker|null/i);
});

test("evaluateAlignment: an unreachable database fails all its checks with the connection error", () => {
  const checks = evaluateAlignment({
    repo: REPO,
    local: snapshot(),
    live: {
      reachable: false,
      error: "getaddrinfo ENOTFOUND ep-nowhere.neon.tech",
      envMarker: null,
      migrationCount: null,
      migrationHeadWhen: null,
      probePresent: false,
    },
  });
  assert.equal(byName(checks, "live: reachable").ok, false);
  assert.match(byName(checks, "live: reachable").detail, /ENOTFOUND/);
  assert.equal(byName(checks, 'live: environment marker is "live"').ok, false);
  assert.equal(byName(checks, "live: migrations match the repo").ok, false);
  assert.equal(byName(checks, "live and local: same migration head").ok, false);
  assert.equal(byName(checks, "local: reachable").ok, true);
});

test("evaluateAlignment: a database with no migrations ledger yet fails the migration check", () => {
  const checks = evaluateAlignment({
    repo: REPO,
    local: snapshot({ migrationCount: null, migrationHeadWhen: null, probePresent: false }),
    live: snapshot({ envMarker: "live" }),
  });
  const check = byName(checks, "local: migrations match the repo");
  assert.equal(check.ok, false);
  assert.match(check.detail, /no migrations|never migrated|ledger/i);
});
