// Thin wrapper around EventSource.
//
// Quirks this wrapper smooths out:
// 1. `addEventListener("error", ...)` catches BOTH server-emitted
//    `event: error` frames AND EventSource's native connection-error event.
//    We distinguish by `.data` — server events have data, native errors don't.
// 2. After a terminal event (done/briefing), EventSource auto-reconnects unless
//    close() was called. We close() explicitly to prevent ghost re-runs.
// 3. When the server ends the response cleanly after done/briefing, the browser
//    fires a native `onerror` on the closed connection. We suppress that by
//    tracking whether any terminal event fired first. Crucially we track this
//    internally for ALL terminal events, not just ones the consumer registered
//    a handler for — otherwise a consumer that doesn't care about `done` still
//    needs the native-error suppression to work.

// Events that signal "this stream is finished; the server will close the HTTP
// response shortly." After any of these, native EventSource connection-close
// errors are suppressed. `next` is terminal for the per-turn plan stream
// (another stream will be opened for the next turn). `briefing` terminates
// the evaluation stream.
const TERMINAL = ["done", "briefing", "next"];

// Watchdog. A stream can connect, emit `thinking`, and then go silent forever —
// the server keeps the socket alive with a heartbeat, so no native error ever
// fires and the screen sits on its skeleton indefinitely. Nothing else in the
// path has a timeout, so this is the only thing standing between a stalled
// stage and a manager staring at a spinner through their 1:1.
//
// 60s is ~6x a real stage (prep briefs measure ~10s end to end). A legitimately
// slow run CAN exceed it during an upstream rate-limit storm; that degrades to
// an error the manager can retry, and the retry is instant because a finished
// result is already cached server-side.
//
// `thinking` deliberately does NOT clear or reset it: `thinking` is exactly what
// the stalled path emits before going quiet, so trusting it would defeat this.
const STALL_MS = 60_000;

// Bounded auto-recovery. A transient connection drop (wifi blip, proxy hiccup)
// used to end the stream on an error card even though the server still had the
// result waiting. We now reopen the stream a couple of times before giving up.
//
// The reconnect URL is SANITISED first: any one-shot trigger like `?regenerate=1`
// is stripped, so a reconnect can only ever RE-ATTACH to the in-flight or cached
// result — never kick off a brand-new (paid) run. That paid-loop risk is the whole
// reason this was parked until the trigger could be made one-shot on reconnect.
const MAX_RECONNECTS = 2;
const RECONNECT_DELAY_MS = 800;

export function openSse(url) {
  const handlers = new Map();
  let errorHandler = null;
  let es = null;
  let closed = false;
  let receivedTerminal = false;
  let stallTimer = null;
  let reconnects = 0;

  function on(event, fn) {
    handlers.set(event, fn);
    return api;
  }
  function onError(fn) {
    errorHandler = fn;
    return api;
  }

  function dispatch(ev, data) {
    const fn = handlers.get(ev);
    if (!fn) return;
    invoke(ev, fn, data);
  }

  // Run a consumer handler and, if it throws or (being async) rejects, surface
  // an error card instead of swallowing it. This is the one hang the 60s watchdog
  // can't catch: the result ARRIVED — so the timer was cleared — but drawing it
  // onto the screen crashed, leaving a half-rendered skeleton with no word and no
  // timeout coming. A crash while drawing the brief must end on an error, not a
  // spinner. We attach a rejection handler rather than blocking the stream.
  function invoke(ev, fn, data) {
    let result;
    try {
      result = fn(data);
    } catch (err) {
      surfaceHandlerCrash(ev, err);
      return;
    }
    if (result && typeof result.then === "function") {
      result.then(undefined, (err) => surfaceHandlerCrash(ev, err));
    }
  }

  function surfaceHandlerCrash(ev, err) {
    console.error(`[sse] handler error for '${ev}':`, err);
    if (closed || receivedTerminal) return;
    receivedTerminal = true;
    clearStall();
    const data = {
      message: "Something went wrong showing your recap. Please try again.",
      recoverable: true,
    };
    // Route to the error card — unless the crashing handler IS the error handler
    // (surfacing to it again would just recurse into the same broken code).
    if (ev !== "error" && handlers.has("error")) dispatch("error", data);
    else if (errorHandler) errorHandler(data);
    close();
  }

  function clearStall() {
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
  }

  // Nothing but `thinking` arrived for STALL_MS: give up and tell the consumer,
  // honestly. Routed through the consumer's own `error` handler where there is
  // one (so it renders the normal error card with its Retry), falling back to
  // onError for consumers that only registered that.
  function onStall() {
    if (closed || receivedTerminal) return;
    receivedTerminal = true;
    const data = {
      message: "This is taking longer than usual. Please try again.",
      timeout: true,
      recoverable: true,
    };
    if (handlers.has("error")) dispatch("error", data);
    else if (errorHandler) errorHandler(data);
    close();
  }

  // Wire a fresh EventSource. Called for the initial connect and for each bounded
  // reconnect (with a sanitised URL — see MAX_RECONNECTS). The watchdog timer is
  // started once in open() and spans all reconnect attempts, so recovery can never
  // outlive the overall 60s cap.
  function connect(connectUrl) {
    es = new EventSource(connectUrl);

    // Always listen for the terminal events internally so we can track them
    // even if the consumer hasn't registered their own handlers.
    for (const ev of TERMINAL) {
      es.addEventListener(ev, (e) => {
        if (closed) return;
        const data = safeParse(e.data);
        receivedTerminal = true;
        clearStall();
        dispatch(ev, data);
        close();
      });
    }

    // Server-emitted `error` frames (always have a .data payload).
    es.addEventListener("error", (e) => {
      if (closed) return;
      if (!e.data) return;   // native close error, not a server frame
      const data = safeParse(e.data);
      receivedTerminal = true;
      clearStall();
      dispatch("error", data);
      close();
    });

    // Register any other consumer-provided handlers (thinking, result, axes, etc.)
    for (const [ev, fn] of handlers) {
      if (ev === "error" || TERMINAL.includes(ev)) continue;  // already wired
      es.addEventListener(ev, (e) => {
        if (closed) return;
        const data = safeParse(e.data);
        // Real progress cancels the watchdog — but `thinking` is not progress.
        if (ev !== "thinking") clearStall();
        invoke(ev, fn, data);
      });
    }

    // Native connection error (no `.data`). Try a bounded reconnect before giving
    // up — never after a terminal event, and always on a URL with one-shot triggers
    // stripped so a reconnect can only re-attach, never re-fire a paid run. We close
    // the failed source ourselves to stop EventSource's own reconnect, which would
    // replay the ORIGINAL (un-sanitised) URL.
    es.onerror = () => {
      if (closed || receivedTerminal) return;
      if (reconnects < MAX_RECONNECTS) {
        reconnects += 1;
        try { es.close(); } catch {}
        setTimeout(() => {
          if (closed || receivedTerminal) return;
          connect(withoutOneShot(url));
        }, RECONNECT_DELAY_MS);
        return;
      }
      if (errorHandler) errorHandler();
      close();
    };
  }

  function open() {
    stallTimer = setTimeout(onStall, STALL_MS);
    connect(url);
    return api;
  }

  function close() {
    if (closed) return;
    closed = true;
    clearStall();
    if (es) try { es.close(); } catch {}
  }

  const api = { on, onError, open, close };
  return api;
}

function safeParse(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

// Strip one-shot query triggers (currently just `regenerate`) so a reconnect
// re-attaches to the existing result instead of starting a fresh paid run.
function withoutOneShot(u) {
  const i = u.indexOf("?");
  if (i === -1) return u;
  const path = u.slice(0, i);
  const kept = u.slice(i + 1).split("&").filter((p) => p && !/^regenerate=/.test(p));
  return kept.length ? `${path}?${kept.join("&")}` : path;
}
