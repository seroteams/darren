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

function createStaticHandler(rootDir: string, opts: { prefix?: string; noindex?: boolean } = {}) {
  const root = path.resolve(rootDir);
  const indexFile = path.join(root, "index.html");
  // Optional mount prefix (admin-live-deploy Phase 2): when the app is served under a
  // sub-path (e.g. "/admin"), strip it before resolving files, so "/admin/assets/x.js"
  // maps to <root>/assets/x.js and "/admin" | "/admin/" serve the index. noindex adds an
  // X-Robots-Tag header so the internal admin console is never search-indexed.
  const prefix = opts.prefix ? opts.prefix.replace(/\/+$/, "") : "";
  const extraHeaders: Record<string, string> = opts.noindex ? { "X-Robots-Tag": "noindex" } : {};

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
        ...extraHeaders,
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
        ...extraHeaders,
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
    let pathname = url.pathname;
    if (prefix) {
      if (pathname === prefix || pathname === prefix + "/") pathname = "/";
      else if (pathname.startsWith(prefix + "/")) pathname = pathname.slice(prefix.length);
    }
    pathname = pathname === "/" ? "/index.html" : pathname;
    const target = safeJoin(root, pathname);
    if (!target) return fallbackIndex(res);
    serveFile(res, target);
  };
}

export { createStaticHandler };
