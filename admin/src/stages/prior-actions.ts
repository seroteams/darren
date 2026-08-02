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

// ...and the boot read is mirrored into sessionStorage, keyed per 1:1, the same way
// the walk-in gate remembers it has been shown. The server stops handing these back
// the moment the meeting has a transcript, so a stage that needs them LATER (the
// recap step, in the arc that withholds the offer at the open) cannot re-ask, and a
// mid-meeting refresh would otherwise drop last time's actions on the floor. Dies
// with the tab, never leaks between two 1:1s.
//
// It is a record of what THIS meeting saw when it started, not a live view. If a
// second 1:1 with the same person closes one of them off in between, the recap here
// can still list it; answering it simply overwrites that outcome. Narrow, and the
// alternative (a stale count on the walk-in card) was the worse of the two.
export function priorActionsKey(sessionId: string): string {
  return `sero.prioractions.${sessionId}`;
}

/** What this 1:1 saw when it started, or undefined if it never got that far. */
export function cachedPriorActions(sessionId: string): PriorActions | null | undefined {
  try {
    const raw = window.sessionStorage.getItem(priorActionsKey(String(sessionId || "")));
    return raw === null ? undefined : (JSON.parse(raw) as PriorActions | null);
  } catch {
    return undefined; // storage blocked or corrupt: nothing to hand on, show nothing
  }
}

// Written ONCE per 1:1, at the first read. Never overwritten, because the later
// read is the one the server refuses (a meeting with a transcript is no longer
// eligible) and a second write would replace the truth with that refusal.
function writeCacheOnce(sessionId: string, prior: PriorActions | null): void {
  try {
    const key = priorActionsKey(sessionId);
    if (window.sessionStorage.getItem(key) !== null) return;
    window.sessionStorage.setItem(key, JSON.stringify(prior));
  } catch {
    /* storage blocked — the in-memory store still carries it for this page life */
  }
}

// The boot read. Always asks the server rather than trusting the cache: two 1:1s
// with the same person can be open in one tab, and a cached count would offer the
// walk-in card actions that the other meeting has already closed off.
export async function loadPriorActions(store: PriorActionsStore): Promise<PriorActions | null> {
  if (store.priorActionsLoaded) return store.priorActions ?? null;
  const id = String(store.sessionId || "");
  if (!id) return null;

  let prior: PriorActions | null = null;
  try {
    const res = (await getPriorPromises(id)) as { prior?: PriorActions } | null;
    prior = res?.prior?.promises?.length ? res.prior : null;
  } catch (e) {
    // A failed read is not cached: the next stage gets to try again.
    console.warn("[prior-actions] read failed (continuing with nothing open):", (e as Error)?.message);
    return null;
  }
  store.priorActionsLoaded = true;
  store.priorActions = prior;
  writeCacheOnce(id, prior);
  return prior;
}

/** How many actions the walk-in card should offer. Zero renders no offer. */
export function openActionCount(prior: PriorActions | null | undefined): number {
  return prior?.promises?.length ?? 0;
}
