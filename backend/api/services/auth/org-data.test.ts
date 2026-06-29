import { test } from "node:test";
import assert from "node:assert/strict";
import { listMyRuns } from "./org-data.repo.ts";
import type { OrgDataRepo, RunRow } from "./org-data.repo.ts";

// A fake store holding two companies' runs. listRuns filters by orgId exactly like
// the real WHERE clause — so this proves the fencing contract without a database.
function fakeRepo(rows: RunRow[]): OrgDataRepo {
  return { async listRuns(orgId) { return rows.filter((r) => r.orgId === orgId); } };
}

const rows: RunRow[] = [
  { id: "r1", orgId: "company-A", label: "A's run", status: null, logDir: "a" },
  { id: "r2", orgId: "company-A", label: "A's other run", status: null, logDir: "a2" },
  { id: "r3", orgId: "company-B", label: "B's run", status: null, logDir: "b" },
];

test("a company sees only its OWN runs — never another company's", async () => {
  const repo = fakeRepo(rows);

  const a = await listMyRuns(repo, "company-A");
  assert.deepEqual(a.map((r) => r.id).sort(), ["r1", "r2"]);
  assert.equal(a.some((r) => r.orgId === "company-B"), false); // B never leaks to A

  const b = await listMyRuns(repo, "company-B");
  assert.deepEqual(b.map((r) => r.id), ["r3"]);
  assert.equal(b.some((r) => r.orgId === "company-A"), false); // A never leaks to B
});

test("a company with no runs sees an empty list (not everyone's)", async () => {
  const repo = fakeRepo(rows);
  const c = await listMyRuns(repo, "company-C");
  assert.deepEqual(c, []);
});
