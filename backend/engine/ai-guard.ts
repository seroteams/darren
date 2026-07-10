// Concurrency cap + circuit breaker for live AI calls (engine-hardening Phase 2).
//
// Mined from old-Sero RUNNER.md: the current engine retries with backoff but has
// no global concurrency limit and no breaker, so a burst of runs can fan out
// uncapped and a failing provider keeps getting hammered. This wraps live model
// calls with both. Cassette replay never reaches here (callAI returns first), so
// offline tests/evals stay deterministic and unthrottled.

export interface Semaphore {
  run<T>(fn: () => Promise<T>): Promise<T>;
  active(): number;
}

// A slot-based limiter: at most `max` fns run at once; the rest queue FIFO.
export function createSemaphore(max: number): Semaphore {
  let active = 0;
  const waiters: Array<() => void> = [];
  const acquire = (): Promise<void> => {
    if (active < max) {
      active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => waiters.push(resolve));
  };
  const release = (): void => {
    const next = waiters.shift();
    if (next) next(); // hand the slot straight to the next waiter (active unchanged)
    else active--; // no waiter: free the slot
  };
  return {
    async run(fn) {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },
    active: () => active,
  };
}

export type BreakerState = "closed" | "open" | "half-open";

export interface Breaker {
  run<T>(fn: () => Promise<T>): Promise<T>;
  state(): BreakerState;
}

export interface BreakerOpts {
  threshold?: number; // consecutive failures before opening (default 5)
  cooldownMs?: number; // how long to stay open before a half-open probe (default 30s)
  now?: () => number; // injectable clock for tests
}

export class CircuitOpenError extends Error {
  constructor() {
    super("AI circuit breaker is open");
    this.name = "CircuitOpenError";
  }
}

export function createBreaker(opts: BreakerOpts = {}): Breaker {
  const threshold = opts.threshold ?? 5;
  const cooldownMs = opts.cooldownMs ?? 30_000;
  const now = opts.now ?? Date.now;
  let failures = 0;
  let state: BreakerState = "closed";
  let openedAt = 0;
  return {
    async run(fn) {
      if (state === "open") {
        if (now() - openedAt >= cooldownMs) state = "half-open"; // allow one probe
        else throw new CircuitOpenError();
      }
      try {
        const result = await fn();
        failures = 0;
        state = "closed";
        return result;
      } catch (err) {
        failures++;
        // A failed half-open probe re-opens immediately; otherwise open at the threshold.
        if (state === "half-open" || failures >= threshold) {
          state = "open";
          openedAt = now();
        }
        throw err;
      }
    },
    state: () => state,
  };
}

export interface AiGuard {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

// Concurrency cap on the outside, breaker on the inside: a call waits for a slot,
// then the breaker decides whether to attempt it. A fast circuit-open failure
// releases its slot immediately.
export function createAiGuard(opts: { concurrency?: number } & BreakerOpts = {}): AiGuard {
  const sem = createSemaphore(opts.concurrency ?? 4);
  const breaker = createBreaker(opts);
  return { run: (fn) => sem.run(() => breaker.run(fn)) };
}

// Process-scoped guard used by ai-client for live calls. Concurrency is env-tunable.
const CONCURRENCY = Number(process.env.AI_MAX_CONCURRENCY) || 4;
export const aiGuard = createAiGuard({ concurrency: CONCURRENCY });
