// Thin controller — parse the request, call the service, format the response. Login
// required (any role) for submit: a tester's note is stamped with who sent it, so
// anonymous is 401. `list` is enforced at the route (superadminV1 in server.ts), so it
// already runs as the allowlisted superadmin. The origin guard lives in server.ts.
// Don't log the message body (it may carry HR-adjacent notes) — store it, don't console it.

import type { RequestContext } from "../../router.ts";
import { createFeedbackService } from "./feedback.service.ts";
import { pgFeedbackRepo } from "./feedback.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAuth } from "../../middleware/require-auth.ts";
import { asRecord } from "../../../shared/guards.ts";

const service = createFeedbackService(pgFeedbackRepo);

export async function submit(c: RequestContext): Promise<void> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity); // 401 when logged out; any role may send feedback

  const body = asRecord(await c.readBody());
  const result = await service.submit(
    { message: body.message, page: body.page },
    { userId: identity.userId, orgId: identity.orgId },
    new Date().toISOString()
  );
  c.json(200, result);
}

/** POST /api/v1/feedback/verdict — the briefing's one-tap verdict (validation-kit
 *  Phase 3). Deliberately NO requireAuth: a guest's tap counts too (mirrors the
 *  client error-report route's anonymous tolerance). Origin-guarded in server.ts;
 *  the service validates the verdict + run id. */
export async function submitVerdict(c: RequestContext): Promise<void> {
  const identity = await buildIdentity(c.req);
  const body = asRecord(await c.readBody());
  const result = await service.submitVerdict(
    { runId: body.runId, verdict: body.verdict, message: body.message },
    { userId: identity.userId, orgId: identity.orgId },
    new Date().toISOString()
  );
  c.json(200, result);
}

/** GET /api/v1/admin/feedback — the most recent notes across every company, newest first. */
export async function list(c: RequestContext): Promise<void> {
  c.json(200, await service.listRecent());
}

/** DELETE /api/v1/admin/feedback/:id — permanently remove one note. Superadmin-gated at the route. */
export async function remove(c: RequestContext): Promise<void> {
  c.json(200, await service.remove(c.params.id ?? ""));
}
