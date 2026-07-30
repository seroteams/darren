// Last time's still-open agreed actions, read once per 1:1 and cached on the
// store (action-review-placement P1).
//
// Both runner entry points need the same answer at the same moment: bank.js and
// questioning.js each render the walk-in card, and the card needs to know how
// many actions are waiting BEFORE it paints — a second button that pops in after
// the fact is worse than no second button. Whichever stage asks first pays for
// the round trip; the other reads the cache.
//
// A failed read is not an error the manager should ever meet: it degrades to
// "nothing open", the walk-in card renders exactly as it does for a first
// meeting, and the promises stay open for next time. Never blocks a 1:1.

import { getPriorPromises } from "../../../shared/api.js";

export interface PriorActions {
  sessionId: string;
  when: number;
  promises: Array<{ id: string; owner: "manager" | "report"; action: string; when: string; outcome: string | null; at: number }>;
}

// The cache lives on the store the stages already share, not in module scope:
// module state would leak from one 1:1 into the next within a single tab.
interface PriorActionsStore {
  sessionId?: string | null;
  priorActions?: PriorActions | null;
  priorActionsLoaded?: boolean;
}

export async function loadPriorActions(store: PriorActionsStore): Promise<PriorActions | null> {
  if (store.priorActionsLoaded) return store.priorActions ?? null;
  let prior: PriorActions | null = null;
  try {
    const res = await getPriorPromises(store.sessionId);
    prior = res?.prior?.promises?.length ? (res.prior as PriorActions) : null;
  } catch (e) {
    console.warn("[prior-actions] read failed (continuing with nothing open):", (e as Error)?.message);
  }
  store.priorActionsLoaded = true;
  store.priorActions = prior;
  return prior;
}

/** How many actions the walk-in card should offer. Zero renders no offer. */
export function openActionCount(prior: PriorActions | null | undefined): number {
  return prior?.promises?.length ?? 0;
}
