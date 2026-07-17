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

export function openSse(url) {
  const handlers = new Map();
  let errorHandler = null;
  let es = null;
  let closed = false;
  let receivedTerminal = false;
  let stallTimer = null;

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
    try { fn(data); } catch (err) {
      console.error(`[sse] handler error for '${ev}':`, err);
    }
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

  function open() {
    es = new EventSource(url);
    stallTimer = setTimeout(onStall, STALL_MS);

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
        try { fn(data); } catch (err) {
          console.error(`[sse] handler error for '${ev}':`, err);
        }
      });
    }

    // Native connection error. Only surface if nothing terminal arrived first.
    es.onerror = () => {
      if (closed || receivedTerminal) return;
      if (errorHandler) errorHandler();
      close();
    };
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
