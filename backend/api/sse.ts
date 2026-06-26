import type { ServerResponse } from "node:http";

const HEARTBEAT_MS = 15_000;

/** A live Server-Sent-Events stream over one response. */
export interface SseStream {
  write(event: string, data?: unknown): void;
  close(): void;
  onClose(fn: () => void): void;
}

function openStream(res: ServerResponse): SseStream {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(":ok\n\n");
  const ping = setInterval(() => {
    if (res.writableEnded) return;
    res.write(":ping\n\n");
  }, HEARTBEAT_MS);
  res.on("close", () => clearInterval(ping));
  return {
    write(event, data) {
      if (res.writableEnded) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data ?? {})}\n\n`);
    },
    close() {
      clearInterval(ping);
      if (!res.writableEnded) res.end();
    },
    onClose(fn) {
      res.on("close", fn);
    },
  };
}

function thinkingLabel(label: string) {
  return { label };
}

export { openStream, thinkingLabel };
