// Role-lexicons logic: forward reads, wrap writes in { ok, ... }. Never touches
// req/res or storage — data comes from the injected repo.

import type { RoleLexiconsRepo } from "./role-lexicons.repo.ts";

export interface RoleLexiconsService {
  list(): unknown[];
  addTerm(key: string, term: unknown, meaning: unknown): { ok: true; term: unknown };
  removeTerm(key: string, term: unknown): { ok: true; remaining: unknown };
}

export function createRoleLexiconsService(repo: RoleLexiconsRepo): RoleLexiconsService {
  return {
    list: () => repo.list(),
    addTerm: (key, term, meaning) => ({ ok: true, term: repo.addTerm(key, { term, meaning }) }),
    removeTerm: (key, term) => ({ ok: true, remaining: repo.removeTerm(key, term) }),
  };
}
