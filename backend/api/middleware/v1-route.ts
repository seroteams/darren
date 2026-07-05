// Wrap a controller handler so any thrown error returns the ONE v1 error shape
// (via toErrorBody) with the right status. Legacy /api/ routes keep the router's
// default { error: string } shape — only v1 routes go through here (decision D2).
// 5xx are logged here; their detail is never sent to the client (engine honesty).
// 5xx are also recorded to the error_logs table (error-log Phase 1) — fire-and-forget,
// so a logging failure can never delay or break the response.

import type { RequestContext, RouteHandler } from "../router.ts";
import { errorStatus, toErrorBody } from "./http-error.ts";
import { logApiError } from "./error-log.ts";

export function v1Route(handler: RouteHandler): RouteHandler {
  return async (c: RequestContext) => {
    try {
      await handler(c);
    } catch (err) {
      const status = errorStatus(err);
      if (status >= 500) {
        console.error("[api/v1]", err);
        void logApiError(c.req, err, status);
      }
      c.json(status, toErrorBody(err));
    }
  };
}
