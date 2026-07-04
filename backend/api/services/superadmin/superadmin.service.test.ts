import { test } from "node:test";
import assert from "node:assert/strict";
import { createSuperadminService } from "./superadmin.service.ts";
import type { SuperadminRepo, OrgRow, UserRow } from "./superadmin.repo.ts";

// A storage-agnostic fake — the service logic (grouping, ordering, the read-only view
// shape) is proven without a database, the same seam the other domains use.
function fakeRepo(orgs: OrgRow[], people: UserRow[]): SuperadminRepo {
  return { listOrganizations: async () => orgs, listUsers: async () => people };
}

test("listRegistered groups users under their company, oldest-first, no secrets in the view", async () => {
  const orgs: OrgRow[] = [
    { id: "o2", name: "Beta", createdAt: new Date("2026-02-01") },
    { id: "o1", name: "Acme", createdAt: new Date("2026-01-01") },
  ];
  const people: UserRow[] = [
    { id: "u3", orgId: "o2", name: "Cara", email: "cara@beta.com", role: "owner", createdAt: new Date("2026-02-02") },
    { id: "u1", orgId: "o1", name: "Ann", email: "ann@acme.com", role: "owner", createdAt: new Date("2026-01-02") },
    { id: "u2", orgId: "o1", name: "Bo", email: "bo@acme.com", role: "member", createdAt: new Date("2026-01-03") },
  ];
  const svc = createSuperadminService(fakeRepo(orgs, people));
  const { companies } = await svc.listRegistered();

  // Oldest company first.
  assert.deepEqual(companies.map((c) => c.name), ["Acme", "Beta"]);
  // Users nested under the right company, oldest-first.
  assert.deepEqual(companies[0]!.users.map((u) => u.name), ["Ann", "Bo"]);
  assert.deepEqual(companies[1]!.users.map((u) => u.name), ["Cara"]);
  // No secret, no internal id leaks into the view.
  for (const c of companies) {
    for (const u of c.users) {
      assert.ok(!("passwordHash" in u), "passwordHash must never appear in the view");
      assert.ok(!("orgId" in u), "internal orgId is not part of the user view");
    }
  }
});

test("listRegistered: a company with no users yet still appears with an empty list", async () => {
  const svc = createSuperadminService(fakeRepo([{ id: "o1", name: "Solo", createdAt: new Date("2026-01-01") }], []));
  const { companies } = await svc.listRegistered();
  assert.equal(companies.length, 1);
  assert.deepEqual(companies[0]!.users, []);
});

test("listRegistered: no companies → empty list, not an error", async () => {
  const svc = createSuperadminService(fakeRepo([], []));
  const { companies } = await svc.listRegistered();
  assert.deepEqual(companies, []);
});
