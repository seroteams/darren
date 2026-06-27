// Lexicon-promotion logic: list pending promotions with a count, apply keep/drop
// decisions. Never touches req/res or storage — data comes from the injected repo.

import type { LexiconRepo, PromotionApplyResult } from "./lexicon.repo.ts";

export interface LexiconService {
  pending(): { items: unknown[]; count: number };
  apply(decisions: unknown): { ok: true } & PromotionApplyResult;
}

export function createLexiconService(repo: LexiconRepo): LexiconService {
  return {
    pending: () => {
      const items = repo.listPending();
      return { items, count: items.length };
    },
    apply: (decisions) => {
      const list = Array.isArray(decisions) ? decisions : [];
      return { ok: true, ...repo.applyDecisions(list) };
    },
  };
}
