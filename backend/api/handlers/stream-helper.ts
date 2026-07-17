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

// Tell one subscriber, and never let its failure reach the others. A subscriber
// whose socket has gone can throw on write; without this guard that throw
// escapes the broadcast loop, so every subscriber BEHIND it in the list hears
// nothing — not the result, not even an error — and sits on its skeleton
// forever behind the heartbeat. One dead screen must not strand the rest.
function tell(stream: SseStream, event: string, data: unknown): void {
  try {
    stream.write(event, data);
  } catch (err) {
    console.warn(`[stream] dropping a dead subscriber on '${event}':`, err instanceof Error ? err.message : err);
  }
}

// Throw away an in-flight stage, telling everyone waiting on it FIRST.
// Callers that just delete the entry and abort the controller leave every
// attached screen hanging forever (an attached subscriber has no completion
// path of its own — it only ever hears from the driving request's broadcast).
function abortStage(session: Session, stageKey: string, reason: string): void {
  const entry = session.inFlight.get(stageKey);
  if (!entry || !isInFlightEntry(entry)) return;
  // Snapshot first: closing a stream fires its onClose, which splices itself out
  // of this very array — iterating it live would skip the next subscriber and
  // strand exactly the screen we are here to rescue.
  for (const s of [...entry.subscribers]) {
    tell(s, "error", { message: reason, recoverable: true });
    try { s.close(); } catch {}
  }
  entry.subscribers.length = 0;
  entry.controller.abort();
  session.inFlight.delete(stageKey);
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

  // Who has been told how this stage ended. The `finally` uses it to guarantee
  // that nobody is left waiting in silence — see the terminal guarantee below.
  const told = new WeakSet<SseStream>();
  const broadcast = (event: string, data: unknown) => {
    const terminal = event === resultEvent || event === "error";
    if (terminal) console.log(`[${stageKey}] ${event} -> ${entry.subscribers.length} subscriber(s)`);
    for (const s of entry.subscribers) {
      tell(s, event, data);
      if (terminal) told.add(s);
    }
  };
  const closeAll = () => {
    // Snapshot — s.close() fires onClose, which splices s out of this array.
    for (const s of [...entry.subscribers]) {
      try { s.close(); } catch {}
    }
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
    // Terminal guarantee. Whatever happened above — including an error thrown
    // somewhere that never reached a broadcast — no subscriber leaves this
    // function un-told. Silence is the one outcome a waiting screen cannot
    // recover from: the heartbeat keeps it alive, so it never even errors.
    for (const s of entry.subscribers) {
      if (told.has(s)) continue;
      tell(s, "error", { message: "This step stopped unexpectedly. Please try again.", recoverable: true });
    }
    closeAll();
    session.inFlight.delete(stageKey);
    setActive(prevTracker);
  }
}

export { runStage, shouldStall, abortStage };
