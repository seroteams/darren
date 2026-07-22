// Boot-time retry for the first database touch (2026-07-21 crash-loop fix).
//
// On Render's free tier the app sleeps after 15 idle minutes; the Neon database
// (ap-southeast-1) suspends after 5. A wake-up therefore hits a COLD database
// with the FIRST query of boot (the migration runner), and a cold cross-region
// connect can exceed the pool's 10s connect timeout. Before this helper, that
// single miss killed the process ("Exited with status 1" alert, 25-35 min of
// downtime); one retry later the database was awake and boot succeeded.
//
// So: give the database ~60s of between-try waiting to wake before dying loud.
// Deliberate-fatal boot errors (EnvGuardError, missing DATABASE_URL) are NOT
// routed through here — only the migration call is wrapped.

export interface BootRetryOpts {
  /** Total tries including the first. Default 6. */
  attempts?: number;
  /** Wait between tries. Default 12s — 6 tries x 12s gaps = 60s of waiting. */
  delayMs?: number;
  /** Injected for tests. Defaults to console.warn / real timer. */
  log?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Run `fn`, retrying transient failures with a fixed delay; rethrows the last
 *  error once attempts are exhausted so boot still dies loud on a real outage. */
export async function bootRetry<T>(fn: () => Promise<T>, opts: BootRetryOpts = {}): Promise<T> {
  const attempts = opts.attempts ?? 6;
  const delayMs = opts.delayMs ?? 12_000;
  const log = opts.log ?? ((m: string) => console.warn(m));
  const sleep = opts.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === attempts) break;
      const reason = e instanceof Error ? e.message : String(e);
      log(`[boot] attempt ${attempt}/${attempts} failed (${reason}) — retry in ${delayMs / 1000}s (database may be waking)`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
