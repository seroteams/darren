// Thin controller — resolve the request, call the service, format the response.
// No logic, no storage. Phase 004 step 3, sub-phase S1a: the first sessions reads.
//
// v1 puts the session id in the PATH (/api/v1/sessions/:id/…, decision D4); the
// legacy /api/ aliases pass it as ?s=<id>. One controller fn serves both route
// variants — resolve the id here, the service just takes the string (storage-
// agnostic). This id resolution is the only wiring delta vs the other domains.
//
// The shared service instance + id/fence helpers live in session-runtime.ts; the
// SSE stream handlers live in session-streams.ts and are re-exported below so the
// router's `import * as sessions` keeps resolving every handler (repo-tidy Phase 3).

import type { RequestContext } from "../../router.ts";
import { service, sessionId, writeId, assertOwner } from "./session-runtime.ts";
import { guestCap } from "./guest-cap.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin, requireAuth } from "../../middleware/require-auth.ts";
import { unauthenticated } from "../../middleware/http-error.ts";
import { asRecord } from "../../../shared/guards.ts";

// The live pipeline streams (focus-points / preparation / bank / evaluation / plan).
export { focusPointsStream, preparationStream, bankStream, evaluationStream, planStream } from "./session-streams.ts";

// GET /api/v1/sessions/:id  ·  GET /api/session?s=<id>
export async function snapshot(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, service.getSnapshot(id));
}

// GET /api/v1/sessions/:id/lexicon/scope  ·  GET /api/lexicon/scope?s=<id>
export async function lexiconScope(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, service.lexiconScope(id));
}

// GET /api/v1/sessions/:id/role-profile  ·  GET /api/role-profile?s=<id>
export async function roleProfile(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, service.roleProfile(id));
}

// GET /api/v1/sessions/:id/preview  ·  GET /api/preview?s=<id>&stage=<stage>
export async function preview(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, service.preview(id, c.query.stage, c.query.draft));
}

// GET /api/v1/sessions/:id/rules — the questioning-panel "Rules" view: the
// guardrails active for this meeting type + what fired last turn. Free (no model).
export async function rules(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, service.rules(id));
}

// GET /api/v1/sessions/:id/question  ·  GET /api/question?s=<id>
export async function question(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, service.question(id));
}

// POST /api/v1/sessions  ·  POST /api/start
// Creates a session (the origin guard + per-IP rate limit live in server.ts, as
// today). 201 with the new session's id/dir/createdAt/introQueueLen. The run is
// stamped with the caller's company (the data wall, Phase 007/2) so its history
// is fenced to that company. Two lanes (guest-run Phase 1):
//  - anonymous (no cookie): allowed, stamps null owner, but spends the shared
//    daily guest budget (429 with a plain message when today's runs are used up);
//  - logged-in: admins/managers only, uncapped — a plain member is still a real
//    403 (member-view: only-runs), not just hidden UI.
export async function start(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const identity = await buildIdentity(c.req);
  if (identity.userId === null) guestCap.take();
  else requireAdmin(identity);
  c.json(201, service.start(body, identity.orgId, identity.userId));
}

// POST /api/v1/sessions/:id/claim — a logged-in caller (any role) takes ownership
// of an OWNERLESS (guest) session, e.g. right after registering at the end of a
// guest run. The service enforces that only ownerless sessions change hands.
export async function claim(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  const identity = await buildIdentity(c.req);
  requireAuth(identity);
  if (!identity.userId || !identity.orgId) throw unauthenticated(); // narrows the types; requireAuth already threw for real anons
  c.json(200, service.claim(id, identity.orgId, identity.userId));
}

// POST /api/v1/sessions/:id/answer  ·  POST /api/answer   (202, as today)
export async function answer(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const id = writeId(c, body);
  await assertOwner(c, id);
  c.json(202, service.answer(id, body));
}

// POST /api/v1/sessions/:id/back  ·  POST /api/back
export async function back(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const id = writeId(c, body);
  await assertOwner(c, id);
  c.json(200, service.back(id));
}

// POST /api/v1/sessions/:id/notes  ·  POST /api/notes
export async function notes(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const id = writeId(c, body);
  await assertOwner(c, id);
  c.json(200, service.notes(id, body));
}

// POST /api/v1/sessions/:id/agenda/cover  ·  POST /api/agenda/cover
export async function agendaCover(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const id = writeId(c, body);
  await assertOwner(c, id);
  c.json(200, service.agendaCover(id, body));
}

// POST /api/v1/sessions/:id/verdict  ·  POST /api/verdict
export async function verdict(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const id = writeId(c, body);
  await assertOwner(c, id);
  c.json(200, service.verdict(id, body));
}

// POST /api/v1/sessions/:id/focus-points/select  ·  POST /api/focus-points/select
export async function selectedFocus(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const id = writeId(c, body);
  await assertOwner(c, id);
  c.json(200, service.selectedFocus(id, body));
}

// POST /api/v1/sessions/:id/lexicon/decisions  ·  POST /api/lexicon/decisions
export async function lexiconDecisions(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const id = writeId(c, body);
  await assertOwner(c, id);
  c.json(200, service.lexiconDecisions(id, body));
}

// GET /api/v1/sessions/:id/suggest-answers  ·  GET /api/suggest-answers?s=<id>
export async function suggestAnswers(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, await service.suggestAnswers(id));
}

// GET /api/v1/sessions/:id/lexicon/candidates  ·  GET /api/lexicon/candidates?s=<id>
export async function lexiconCandidates(c: RequestContext): Promise<void> {
  const id = sessionId(c);
  await assertOwner(c, id);
  c.json(200, await service.lexiconCandidates(id));
}
