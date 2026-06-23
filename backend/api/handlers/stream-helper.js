const { openStream } = require("../sse");
const { persist } = require("../session-persistence");
const cost = require("../../engine/cost");

// runStage(session, stageKey, { thinkingLabel, produce, onResult, resultEvent })
//
// Idempotent SSE replay for one stage. Emits `thinking` (briefly on replay,
// continuously during fresh runs) and then `{resultEvent}` with the payload,
// then `done`. Multiple clients for the same stage attach to a single in-flight
// AbortController and share events via a subscriber list.
async function runStage(
  c,
  session,
  stageKey,
  {
    thinkingLabel,
    produce,        // async () => result
    getCached,      // () => cached result or null/undefined
    setCached,      // (result) => void
    resultEvent,    // string e.g. "result"
    buildPayload,   // (result) => any
  }
) {
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
  if (existing) {
    existing.subscribers.push(stream);
    stream.write("thinking", { label: thinkingLabel });
    stream.onClose(() => {
      const i = existing.subscribers.indexOf(stream);
      if (i >= 0) existing.subscribers.splice(i, 1);
    });
    return;
  }

  // --- Case 3: fresh run
  const entry = {
    subscribers: [stream],
    controller: new AbortController(),
  };
  session.inFlight.set(stageKey, entry);

  const broadcast = (event, data) => {
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

  const prevTracker = cost.getActive();
  cost.setActive(session.tracker);
  try {
    const result = await produce(entry.controller.signal);
    setCached(result);
    persist(session);
    broadcast(resultEvent, buildPayload(result));
    broadcast("done", {});
    closeAll();
  } catch (err) {
    const recoverable = err.recoverable === true;
    console.error(`[${stageKey}] failed:`, err?.stack || err);
    broadcast("error", { message: err.message || String(err), recoverable });
    closeAll();
  } finally {
    session.inFlight.delete(stageKey);
    cost.setActive(prevTracker);
  }
}

module.exports = { runStage };
