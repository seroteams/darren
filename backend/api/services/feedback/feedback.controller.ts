// Thin controller — parse the request, call the service, format the response. Login
// required (any role): a tester's note is stamped with who sent it, so anonymous is 401.
// The origin guard lives in server.ts. Don't log the message body (it may carry
// HR-adjacent notes) — store it, don't console it.

import type { RequestContext } from "../../router.ts";
import { createFeedbackService } from "./feedback.service.ts";
import { fileFeedbackRepo } from "./feedback.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAuth } from "../../middleware/require-auth.ts";
import { asRecord } from "../../../shared/guards.ts";

const service = createFeedbackService(fileFeedbackRepo);

export async function submit(c: RequestContext): Promise<void> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity); // 401 when logged out; any role may send feedback

  const body = asRecord(await c.readBody());
  const result = service.submit(
    { message: body.message, page: body.page },
    { userId: identity.userId, orgId: identity.orgId },
    new Date().toISOString()
  );
  c.json(200, result);
}
