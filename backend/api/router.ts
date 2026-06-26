import { URL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 1_000_000; // 1 MB cap on request bodies to prevent memory exhaustion

// Disk/wire/error values are unknown until checked — narrow with this guard
// instead of trusting shapes (the established house pattern).
function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

/** The per-request context handed to every route handler. */
export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  query: Record<string, string>;
  params: Record<string, string>;
  readBody: () => Promise<unknown>;
  json: (status: number, data: unknown) => void;
  error: (err: unknown) => void;
}

export type RouteHandler = (c: RequestContext) => unknown | Promise<unknown>;
type Fallback = (req: IncomingMessage, res: ServerResponse, url: URL) => void;

interface Route {
  method: string;
  pattern: string | RegExp;
  handler: RouteHandler;
}

function createRouter() {
  const routes: Route[] = [];

  function add(method: string, pattern: string | RegExp, handler: RouteHandler): void {
    routes.push({ method, pattern, handler });
  }

  function match(
    method: string | undefined,
    pathname: string
  ): { handler: RouteHandler; params: Record<string, string> } | null {
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

  async function readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let aborted = false;
      req.on("data", (c: Buffer) => {
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

  function sendJson(res: ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  }

  function sendError(res: ServerResponse, err: unknown): void {
    const status = (isObjectRecord(err) && typeof err.status === "number" ? err.status : 0) || 500;
    const msg = (isObjectRecord(err) && typeof err.message === "string" ? err.message : "") || "Internal error";
    if (status >= 500) console.error("[api]", err);
    sendJson(res, status, { error: msg });
  }

  async function handle(req: IncomingMessage, res: ServerResponse, { fallback }: { fallback?: Fallback } = {}): Promise<void> {
    const url = new URL(req.url ?? "", `http://${req.headers.host || "localhost"}`);
    const hit = match(req.method, url.pathname);
    if (!hit) {
      if (fallback) return fallback(req, res, url);
      return sendJson(res, 404, { error: "Not found" });
    }
    const ctx: RequestContext = {
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

export { createRouter };
