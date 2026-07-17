import { openStream } from "../sse.ts";
import { persist } from "../session-persistence.ts";
import { getActive, setActive } from "../../engine/cost.ts";
import type { SseStream } from "../sse.ts";
import type { RequestContext } from "../router.ts";
import type { Session } from "../../shared/session.types.ts";
import { isObjectRecord } from "../../shared/guards.ts";

// The shared Session types inFlight as Map<string, unknown> (internal de-dup);
// the entries are the shape we put in here. Narrow on read with the guard below.
interface InFlightEntry {
  subscribers: SseStream[];
  controller: AbortController;
}
function isInFlightEntry(v: unknown): v is InFlightEntry {
  return isObjectRecord(v) && Array.isArray(v.subscribers) && v.controller instanceof AbortController;
}

// Dev-only stall switch. Set SERO_STALL_STAGE=<stageKey> (e.g. "preparation",
// "focus-points") to make that stage hang on purpose, so the client's stall
// handling is walkable without waiting for a rare real one. It replaces the
// model call entirely, so a walk costs nothing. Never active in production —
// same guard style as DEV_AUTOLOGIN (request-context.ts).
function shouldStall(stageKey: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return !!process.env.SERO_STALL_STAGE && process.env.SERO_STALL_STAGE === stageKey;
}

// Hangs until aborted — never resolves, never calls the model.
function stallForever(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
}

interface RunStageOptions<T> {
  thinkingLabel: string;
  produce: (signal: AbortSignal) => Promise<T>; // async () => result
  getCached: () => T | null | undefined; // () => cached result or null/undefined
  setCached: (result: T) => void; // (result) => void
  resultEvent: string; // string e.g. "result"
  buildPayload: (result: T) => unknown; // (result) => any
}

// runStage(session, stageKey, { thinkingLabel, produce, onResult, resultEvent })
//
// Idempotent SSE replay for one stage. Emits `thinking` (briefly on replay,
// continuously during fresh runs) and then `{resultEvent}` with the payload,
// then `done`. Multiple clients for the same stage attach to a single in-flight
// AbortController and share events via a subscriber list.
async function runStage<T>(
  c: RequestContext,
  session: Session,
  stageKey: string,
  {
    thinkingLabel,
    produce,
    getCached,
    setCached,
    resultEvent,
    buildPayload,
  }: RunStageOptions<T>
): Promise<void> {
  const stream = openStream(c.res);

  // --- Case 1: result already cached -> brief replay
  const cached = getCached();
  if (cached) {
    stream.write("thinking", { label: thinkingLabel });
    setTimeout(() => {
      if (c.res.writableEnded) return;
      try {
        stream.write(resultEvent, buildPayload(cached));
        stream.write("done", {});
      } finally {
        stream.close();
      }
    }, 250);
    return;
  }

  // --- Case 2: another client is already driving this stage -> attach
  const existing = session.inFlight.get(stageKey);
  if (existing && isInFlightEntry(existing)) {
    existing.subscribers.push(stream);
    stream.write("thinking", { label: thinkingLabel });
    stream.onClose(() => {
      const i = existing.subscribers.indexOf(stream);
      if (i >= 0) existing.subscribers.splice(i, 1);
    });
    return;
  }

  // --- Case 3: fresh run
  const entry: InFlightEntry = {
    subscribers: [stream],
    controller: new AbortController(),
  };
  session.inFlight.set(stageKey, entry);

  const broadcast = (event: string, data: unknown) => {
    for (const s of entry.subscribers) s.write(event, data);
  };
  const closeAll = () => {
    for (const s of entry.subscribers) s.close();
    entry.subscribers.length = 0;
  };

  broadcast("thinking", { label: thinkingLabel });
  stream.onClose(() => {
    const i = entry.subscribers.indexOf(stream);
    if (i >= 0) entry.subscribers.splice(i, 1);
  });

  const prevTracker = getActive();
  setActive(session.tracker);
  try {
    if (shouldStall(stageKey)) console.warn(`[${stageKey}] SERO_STALL_STAGE active — stalling on purpose (dev only)`);
    const run = shouldStall(stageKey) ? stallForever : produce;
    const result = await run(entry.controller.signal);
    setCached(result);
    persist(session);
    broadcast(resultEvent, buildPayload(result));
    broadcast("done", {});
    closeAll();
  } catch (err) {
    const recoverable = isObjectRecord(err) && err.recoverable === true;
    console.error(`[${stageKey}] failed:`, (isObjectRecord(err) && err.stack) || err);
    broadcast("error", { message: (err instanceof Error && err.message) || String(err), recoverable });
    closeAll();
  } finally {
    session.inFlight.delete(stageKey);
    setActive(prevTracker);
  }
}

export { runStage, shouldStall };
