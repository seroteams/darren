#!/usr/bin/env node
// Minimal static file server (for previewing generated verdict.html).
// Run: node scripts/serve-static.js <dir> <port>
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.resolve(process.argv[2] || ".");
const port = Number(process.argv[3] || 4178);
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/verdict.html";
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`static server on http://localhost:${port} (root: ${root})`));
