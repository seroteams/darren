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

export function openSse(url) {
  const handlers = new Map();
  let errorHandler = null;
  let es = null;
  let closed = false;
  let receivedTerminal = false;

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

  function open() {
    es = new EventSource(url);

    // Always listen for the terminal events internally so we can track them
    // even if the consumer hasn't registered their own handlers.
    for (const ev of TERMINAL) {
      es.addEventListener(ev, (e) => {
        if (closed) return;
        const data = safeParse(e.data);
        receivedTerminal = true;
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
      dispatch("error", data);
      close();
    });

    // Register any other consumer-provided handlers (thinking, result, axes, etc.)
    for (const [ev, fn] of handlers) {
      if (ev === "error" || TERMINAL.includes(ev)) continue;  // already wired
      es.addEventListener(ev, (e) => {
        if (closed) return;
        const data = safeParse(e.data);
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
    if (es) try { es.close(); } catch {}
  }

  const api = { on, onError, open, close };
  return api;
}

function safeParse(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}
