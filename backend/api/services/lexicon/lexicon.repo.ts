// Data access for cross-session lexicon promotion (the global word list) — the
// storage seam. Delegates to the promote-core engine, which reads the candidate
// yaml files and rolls keeps into the canonical role lexicons. A DB-backed impl
// can replace `fileLexiconRepo` without touching the service. Pending items are
// opaque to the service (it only counts/forwards them), so they're typed unknown.

import { listPendingPromotions, applyPromotionDecisions } from "../../../engine/lexicon/promote-core.ts";

export interface PromotionApplyResult {
  promoted: number;
  dropped: number;
  skipped: number;
  remaining: number;
}

export interface LexiconRepo {
  listPending(): unknown[];
  applyDecisions(decisions: Array<{ id?: unknown; keep?: unknown }>): PromotionApplyResult;
}

export const fileLexiconRepo: LexiconRepo = {
  listPending: () => listPendingPromotions(),
  applyDecisions: (decisions) => applyPromotionDecisions(decisions),
};
