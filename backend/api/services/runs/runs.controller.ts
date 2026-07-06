// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. Origin guards on the mutating routes live in server.ts.
// Covers run history + Run Review; suggest-fix (the AI route) stays in its handler.

import type { RequestContext } from "../../router.ts";
import { createRunsService } from "./runs.service.ts";
import { fileRunsRepo } from "./runs.repo.ts";
import { aboutMeService } from "./about-me.service.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin, requireAuth } from "../../middleware/require-auth.ts";

const service = createRunsService(fileRunsRepo);

// The caller's company from the session cookie, ADMIN required (admin-access-guard
// Phase 2). Run history + Run Review are internal QA tooling, so a logged-in non-admin
// member is refused (403); anonymous is 401. The dev side-door still yields an owner
// identity, so dev one-click is unaffected. All runs handlers resolve through here, so
// this one guard protects every runs endpoint.
async function callerOrgId(c: RequestContext): Promise<string | null> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity);
  return identity.orgId;
}

// The caller's full identity for the "prefill a run" tool. Returns userId too, because
// clone stamps the caller as the run's owner so it lands in their own /mine list. Access:
// admins always; in dev, ANY logged-in user — so the test manager account we use for QA
// (member@seroteams.com, a plain member) can prefill while experiencing the manager side.
// In production it stays admin-only, so real members never clone.
async function callerPrefill(c: RequestContext): Promise<{ userId: string | null; orgId: string | null }> {
  const identity = await buildIdentity(c.req);
  if (process.env.NODE_ENV === "production") requireAdmin(identity);
  else requireAuth(identity);
  return { userId: identity.userId, orgId: identity.orgId };
}

export async function recent(c: RequestContext): Promise<void> {
  c.json(200, service.recent(c.query.limit, await callerOrgId(c)));
}

export async function finished(c: RequestContext): Promise<void> {
  c.json(200, service.finished(await callerOrgId(c)));
}

export async function overview(c: RequestContext): Promise<void> {
  c.json(200, service.overview(c.params.id, await callerOrgId(c)));
}

export async function full(c: RequestContext): Promise<void> {
  c.json(200, service.full(c.params.id, await callerOrgId(c)));
}

export async function stages(c: RequestContext): Promise<void> {
  c.json(200, service.stages(c.params.id, await callerOrgId(c)));
}

export async function del(c: RequestContext): Promise<void> {
  c.json(200, service.remove(c.params.id, await callerOrgId(c)));
}

export async function archive(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  c.json(200, service.archive(c.params.id, body, await callerOrgId(c)));
}

export async function review(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  c.json(200, service.review(c.params.id, body, await callerOrgId(c)));
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

// Dev-only "prefill a run" (admin-guarded): list clonable finished runs, and clone one
// into a fresh run owned by the caller so they can walk a full run without paying to
// generate it. clone reads { sourceId } from the body and returns { id } of the new run.
export async function clonable(c: RequestContext): Promise<void> {
  await callerPrefill(c);
  c.json(200, service.clonable());
}

export async function clone(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerPrefill(c);
  const body = await c.readBody();
  const sourceId = typeof (body as { sourceId?: unknown })?.sourceId === "string"
    ? (body as { sourceId: string }).sourceId
    : undefined;
  c.json(200, service.clone(sourceId, orgId, userId));
}

export async function mine(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, service.myFinished(orgId, userId, c.query.open));
}

export async function mineDetail(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, service.myRun(c.params.id, orgId, userId));
}

// Rate one of the caller's own runs (pre-go-live PG3): login required, any role; the
// service fences by org + user (a run you don't own → 404). Origin-guarded in server.ts.
export async function rateMine(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  const body = await c.readBody();
  c.json(200, service.rateMine(c.params.id, body, orgId, userId));
}

// "1:1s about me" (people-roster Phase 5): login required, ANY role — a member linked to
// a roster person sees the list-only history of 1:1s about them. All fencing + privacy
// minimalism lives in aboutMeService (org-fenced walk, no notes/briefing/ratings).
export async function aboutMe(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  c.json(200, await aboutMeService.aboutMe(orgId, userId));
}
