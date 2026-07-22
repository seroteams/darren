// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. Origin guards on the mutating routes live in server.ts.
// Covers run history + Run Review; suggest-fix (the AI route) stays in its handler.

import type { RequestContext } from "../../router.ts";
import { createRunsService } from "./runs.service.ts";
import { runsRepo } from "./runs.repo.ts";
import { aboutMeService } from "./about-me.service.ts";
import { listCompletedGuidedSlim } from "../guided-sessions/guided-slim.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin, requireAuth, requirePrefillAccess, isInternalIdentity } from "../../middleware/require-auth.ts";

// Finished Monthly Check-ins merge into the manager's run history (Phase 6, add-a-source).
const service = createRunsService(runsRepo, { listCompletedGuidedSlim });

// The caller's fence from the session cookie, ADMIN required (admin-access-guard
// Phase 2; a logged-in non-admin member is 403, anonymous 401). Two walls ride it:
// orgId is the company wall (Phase 007/2), and userId is the manager-privacy wall —
// a plain `manager` (what every customer signup gets) is fenced to their OWN runs, so
// a colleague manager's runs (notes, "private, just for you" briefings) answer
// "unknown". Internal admins (role admin / superadmin-by-email) pass a null userId
// and keep the org-wide QA view. The dev side-door identity has role admin, so dev
// one-click is unaffected. All runs handlers resolve through here, so this one guard
// protects every runs endpoint.
async function callerFence(c: RequestContext): Promise<{ orgId: string | null; userId: string | null }> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity);
  return { orgId: identity.orgId, userId: isInternalIdentity(identity) ? null : identity.userId };
}

// The caller's full identity for the "prefill a run" tool. Returns userId too, because
// clone stamps the caller as the run's owner so it lands in their own /mine list. Access
// is SUPERADMIN-only in production (requirePrefillAccess) — this tool reads runs unfenced
// across every company, and `manager` is what every customer signup gets, so an admin/
// manager gate would let any customer clone another company's run. In dev it stays
// any-logged-in, so the local QA one-click (member@seroteams.com) is unaffected.
async function callerPrefill(c: RequestContext): Promise<{ userId: string | null; orgId: string | null }> {
  const identity = await buildIdentity(c.req);
  requirePrefillAccess(identity);
  return { userId: identity.userId, orgId: identity.orgId };
}

export async function recent(c: RequestContext): Promise<void> {
  const fence = await callerFence(c);
  c.json(200, await service.recent(c.query.limit, fence.orgId, fence.userId));
}

export async function finished(c: RequestContext): Promise<void> {
  const fence = await callerFence(c);
  c.json(200, await service.finished(fence.orgId, fence.userId));
}

export async function overview(c: RequestContext): Promise<void> {
  const fence = await callerFence(c);
  c.json(200, await service.overview(c.params.id, fence.orgId, fence.userId));
}

export async function full(c: RequestContext): Promise<void> {
  const fence = await callerFence(c);
  c.json(200, await service.full(c.params.id, fence.orgId, fence.userId));
}

export async function stages(c: RequestContext): Promise<void> {
  const fence = await callerFence(c);
  c.json(200, await service.stages(c.params.id, fence.orgId, fence.userId));
}

export async function del(c: RequestContext): Promise<void> {
  const fence = await callerFence(c);
  c.json(200, await service.remove(c.params.id, fence.orgId, fence.userId));
}

export async function archive(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  const fence = await callerFence(c);
  c.json(200, await service.archive(c.params.id, body, fence.orgId, fence.userId));
}

export async function review(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  const fence = await callerFence(c);
  c.json(200, await service.review(c.params.id, body, fence.orgId, fence.userId));
}

// The caller's own identity — login required, ANY role (member-nav Phase 2). The member
// "my runs" endpoints use this instead of callerOrgId: a plain member reads their OWN
// runs even though the admin runs tooling above stays owner/admin-only. Fenced by both
// orgId and userId in the service, so a member never sees another member's or an admin's.
async function callerIdentity(c: RequestContext): Promise<{ userId: string | null; orgId: string | null }> {
  const identity = await buildIdentity(c.req);
  requireAuth(identity); // 401 when logged out; no role check
  return { userId: identity.userId, orgId: identity.orgId };
}

// Internal "prefill a run" tool (superadmin-only in production, see callerPrefill): list
// clonable finished runs, and clone one into a fresh run owned by the caller so they can
// walk a full run without paying to generate it. clone reads { sourceId } from the body
// and returns { id } of the new run.
export async function clonable(c: RequestContext): Promise<void> {
  await callerPrefill(c);
  c.json(200, await service.clonable());
}

export async function clone(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerPrefill(c);
  const body = await c.readBody();
  const sourceId = typeof (body as { sourceId?: unknown })?.sourceId === "string"
    ? (body as { sourceId: string }).sourceId
    : undefined;
  c.json(200, await service.clone(sourceId, orgId, userId));
}

export async function mine(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, await service.myFinished(orgId, userId, c.query.open));
}

export async function mineDetail(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, await service.myRun(c.params.id, orgId, userId));
}

// Rate one of the caller's own runs (pre-go-live PG3): login required, any role; the
// service fences by org + user (a run you don't own → 404). Origin-guarded in server.ts.
export async function rateMine(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  const body = await c.readBody();
  c.json(200, await service.rateMine(c.params.id, body, orgId, userId));
}

// "1:1s about me" (people-roster Phase 5): login required, ANY role — a member linked to
// a roster person sees the list-only history of 1:1s about them. All fencing + privacy
// minimalism lives in aboutMeService (org-fenced walk, no notes/briefing/ratings).
export async function aboutMe(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, await aboutMeService.aboutMe(orgId, userId));
}
