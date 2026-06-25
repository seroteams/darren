// Serves the static run library (logs/index.html + per-run review.html pages)
// over HTTP so it's reachable from the running app. Lives under /api/library/
// so the Vite dev proxy (which only forwards /api) reaches it in dev, and the
// API server serves it directly in prod.
//
// Read-only: streams existing files from logs/, with a safe-join guard so a
// crafted path can't escape the logs root.

const fs = require("node:fs");
const path = require("node:path");
const { LOGS_ROOT } = require("../../engine/session.ts");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const ROOT = path.resolve(LOGS_ROOT);

function safeJoin(target) {
  const resolved = path.resolve(ROOT, "." + target);
  return resolved === ROOT || resolved.startsWith(ROOT + path.sep) ? resolved : null;
}

module.exports = function library(c) {
  const rest = c.params.rest; // undefined | "/" | "/index.html" | "/june/<id>/review.html"
  if (rest === undefined || rest === "") {
    // Redirect bare /api/library to /api/library/ so the index's relative
    // links resolve under /api/library/ rather than /api/.
    c.res.writeHead(302, { Location: "/api/library/" });
    return c.res.end();
  }

  let target = decodeURIComponent(rest);
  if (target === "/") target = "/index.html";

  const filePath = safeJoin(target);
  if (!filePath) {
    c.res.writeHead(403, { "Content-Type": "text/plain" });
    return c.res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      c.res.writeHead(404, { "Content-Type": "text/plain" });
      return c.res.end("Not found. Run `npm run review` to generate the library.");
    }
    const ext = path.extname(filePath).toLowerCase();
    c.res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(filePath).pipe(c.res);
  });
};
