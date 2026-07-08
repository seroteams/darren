import type { RequestContext } from "../../router.ts";

// Public liveness probe — Render's health check and the /release watch loop poll
// this anonymously, so it must stay auth-free and touch no disk, DB, or AI.
export function health(c: RequestContext): void {
  c.json(200, { ok: true });
}
