const HEARTBEAT_MS = 15_000;

function openStream(res) {
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

function thinkingLabel(label) {
  return { label };
}

module.exports = { openStream, thinkingLabel };
