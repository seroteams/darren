const { URL } = require("node:url");

const MAX_BODY_BYTES = 1_000_000; // 1 MB cap on request bodies to prevent memory exhaustion

function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    routes.push({ method, pattern, handler });
  }

  function match(method, pathname) {
    for (const r of routes) {
      if (r.method !== method) continue;
      if (typeof r.pattern === "string") {
        if (r.pattern === pathname) return { handler: r.handler, params: {} };
      } else if (r.pattern instanceof RegExp) {
        const m = pathname.match(r.pattern);
        if (m) return { handler: r.handler, params: m.groups || {} };
      }
    }
    return null;
  }

  async function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      let aborted = false;
      req.on("data", (c) => {
        if (aborted) return; // over the cap — stop buffering, let the handler reply 413
        size += c.length;
        if (size > MAX_BODY_BYTES) {
          aborted = true;
          return reject(Object.assign(new Error("Request body too large"), { status: 413 }));
        }
        chunks.push(c);
      });
      req.on("end", () => {
        if (aborted) return;
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(Object.assign(new Error("Invalid JSON body"), { status: 400 }));
        }
      });
      req.on("error", reject);
    });
  }

  function sendJson(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  }

  function sendError(res, err) {
    const status = err.status || 500;
    const msg = err.message || "Internal error";
    if (status >= 500) console.error("[api]", err);
    sendJson(res, status, { error: msg });
  }

  async function handle(req, res, { fallback } = {}) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const hit = match(req.method, url.pathname);
    if (!hit) {
      if (fallback) return fallback(req, res, url);
      return sendJson(res, 404, { error: "Not found" });
    }
    const ctx = {
      req,
      res,
      url,
      query: Object.fromEntries(url.searchParams),
      params: hit.params,
      readBody: () => readBody(req),
      json: (status, data) => sendJson(res, status, data),
      error: (err) => sendError(res, err),
    };
    try {
      await hit.handler(ctx);
    } catch (e) {
      sendError(res, e);
    }
  }

  return { add, handle, sendJson, sendError };
}

module.exports = { createRouter };
