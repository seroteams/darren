import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function createStaticHandler(rootDir: string) {
  const root = path.resolve(rootDir);
  const indexFile = path.join(root, "index.html");

  function safeJoin(base: string, target: string): string | null {
    const resolved = path.resolve(base, "." + target);
    if (!resolved.startsWith(base)) return null;
    return resolved;
  }

  function serveFile(res: ServerResponse, filePath: string): void {
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) return fallbackIndex(res);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": stat.size,
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
      });
      fs.createReadStream(filePath).pipe(res);
    });
  }

  function fallbackIndex(res: ServerResponse): void {
    fs.stat(indexFile, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found. Run `npm run build` first.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": stat.size,
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(indexFile).pipe(res);
    });
  }

  return function handle(req: IncomingMessage, res: ServerResponse, url: URL): void {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const target = safeJoin(root, pathname);
    if (!target) return fallbackIndex(res);
    serveFile(res, target);
  };
}

export { createStaticHandler };
