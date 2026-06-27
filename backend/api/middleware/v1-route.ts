// Wrap a controller handler so any thrown error returns the ONE v1 error shape
// (via toErrorBody) with the right status. Legacy /api/ routes keep the router's
// default { error: string } shape — only v1 routes go through here (decision D2).
// 5xx are logged here; their detail is never sent to the client (engine honesty).

import type { RequestContext, RouteHandler } from "../router.ts";
import { errorStatus, toErrorBody } from "./http-error.ts";

export function v1Route(handler: RouteHandler): RouteHandler {
  return async (c: RequestContext) => {
    try {
      await handler(c);
    } catch (err) {
      const status = errorStatus(err);
      if (status >= 500) console.error("[api/v1]", err);
      c.json(status, toErrorBody(err));
    }
  };
}
