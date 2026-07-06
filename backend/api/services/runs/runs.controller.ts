// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. Origin guards on the mutating routes live in server.ts.
// Covers run history + Run Review; suggest-fix (the AI route) stays in its handler.

import type { RequestContext } from "../../router.ts";
import { createRunsService } from "./runs.service.ts";
import { fileRunsRepo } from "./runs.repo.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin, requireAuth } from "../../middleware/require-auth.ts";
import { forbidden } from "../../middleware/http-error.ts";
import { peopleService } from "../team/people.service.ts";

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

// "Prefill a run" is a DEV-ONLY QA helper: clone a finished run to walk it without paying
// for a fresh one. Its source lookup is deliberately UNFENCED (it reads finished runs across
// every company on disk), so it must never be reachable in production — there, real tenants
// exist and an unfenced clone let any admin/manager read another company's runs + briefings
// (F-002). So the gate is env, not role: refuse in production outright; in dev, any logged-in
// user may use it (incl. the plain-member QA account experiencing the manager side).
export function prefillAllowed(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}

async function callerPrefill(c: RequestContext): Promise<{ userId: string | null; orgId: string | null }> {
  if (!prefillAllowed(process.env.NODE_ENV)) throw forbidden("Prefill is a dev-only tool");
  const identity = await buildIdentity(c.req);
  requireAuth(identity);
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

// The 1:1s ABOUT the caller (people-roster Phase 5) — login required, ANY role (this is
// the member's payoff read). The roster resolves which person rows are linked to the
// caller (merge chains included); the run rows are list-only by construction (see the
// service). An unlinked caller simply gets an empty list.
export async function aboutMe(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  if (!userId || !orgId) {
    c.json(200, { runs: [] });
    return;
  }
  const personIds = await peopleService.linkedPersonIds(orgId, userId);
  // Manager display names for the rows — from the same org-users read the link picker uses.
  const managerNames: Record<string, string> = {};
  if (personIds.length) {
    for (const u of (await peopleService.linkableUsers(orgId)).users) managerNames[u.id] = u.name;
  }
  c.json(200, service.aboutMe(orgId, personIds, managerNames));
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

// Record whether one of last time's agreed actions happened (continuity Phase 2): login
// required, any role; same org+user fence as rateMine. Origin-guarded in server.ts.
export async function setOutcomeMine(c: RequestContext): Promise<void> {
  const { userId, orgId } = await callerIdentity(c);
  const body = await c.readBody();
  c.json(200, service.setOutcomeMine(c.params.id, body, orgId, userId));
}
