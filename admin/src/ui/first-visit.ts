// "Has this manager actually run a 1:1 yet?", held for the whole app shell
// (onboarding-firstrun Phase 3). The left rail asks it to decide whether to stay quiet.
//
// Three states, deliberately. `null` means nobody has asked yet, and it is NOT the same
// as "no": the rail only quiets on a positive no. An unknown answer keeps today's full
// rail, so a manager who lands somewhere Home has not loaded (a deep link, a claimed
// guest run) can never be handed a stripped-down app by accident.
//
// The answer itself comes from the one shared rule in stages/start-rows.ts, so Home,
// the prep wizard and the rail cannot disagree about what counts as a real 1:1.

type Answer = boolean | null;

let hasRuns: Answer = null;
const listeners = new Set<() => void>();

/** Record what the runs list said. Callers pass the result of hasRealRuns(). */
export function setHasRealRuns(value: boolean): void {
  const next = Boolean(value);
  if (next === hasRuns) return;
  hasRuns = next;
  for (const fn of listeners) fn();
}

/** True only when we KNOW the account has no real 1:1s yet. */
export function isFirstVisit(): boolean {
  return hasRuns === false;
}

/** Re-render me when the answer changes (the rail subscribes once, at construction). */
export function onFirstVisitChange(fn: () => void): void {
  listeners.add(fn);
}

/** Tests only: forget the answer between cases. */
export function resetFirstVisit(): void {
  hasRuns = null;
  listeners.clear();
}
