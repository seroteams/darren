// The superadmin view service (pre-go-live PG6) — the read-only, cross-company picture
// Carl uses to watch the alpha. Read-only by construction: it imports only the read repo
// and exposes no mutation. All it does is shape the two reads (companies, users) into
// "every company and the people in it", oldest-first, with no secrets in the view.

import { pgSuperadminRepo } from "./superadmin.repo.ts";
import type { SuperadminRepo } from "./superadmin.repo.ts";

/** A person as the superadmin view shows them — no passwordHash, no internal orgId. */
export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

/** A company with the people in it. */
export interface RegisteredCompany {
  id: string;
  name: string;
  createdAt: Date;
  users: RegisteredUser[];
}

export interface SuperadminService {
  /** Every company and its users, companies oldest-first, users oldest-first. */
  listRegistered(): Promise<{ companies: RegisteredCompany[] }>;
}

export function createSuperadminService(repo: SuperadminRepo = pgSuperadminRepo): SuperadminService {
  return {
    async listRegistered() {
      const [orgs, people] = await Promise.all([repo.listOrganizations(), repo.listUsers()]);
      const oldestFirst = (a: { createdAt: Date }, b: { createdAt: Date }) =>
        a.createdAt.getTime() - b.createdAt.getTime();
      // Bucket users by company. Sort the flat list first, so each company's list comes
      // out oldest-first too (this service owns the ordering, not the repo).
      const byOrg = new Map<string, RegisteredUser[]>();
      for (const u of [...people].sort(oldestFirst)) {
        const list = byOrg.get(u.orgId) ?? [];
        list.push({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });
        byOrg.set(u.orgId, list);
      }
      const companies: RegisteredCompany[] = [...orgs].sort(oldestFirst).map((o) => ({
        id: o.id,
        name: o.name,
        createdAt: o.createdAt,
        users: byOrg.get(o.id) ?? [],
      }));
      return { companies };
    },
  };
}

export const superadminService = createSuperadminService();
